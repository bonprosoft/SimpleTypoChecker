'use strict';

import * as vscode from 'vscode';
import * as events from 'events';

import { Delayer } from './delayer';
import * as utils from './utils';

interface Map<V> {
    [key: string]: V;
}

export default class DocumentChecker implements vscode.CodeActionProvider, vscode.Disposable {

    private _disposable: vscode.Disposable;

    private _validationDelayer: Map<Delayer<void>> = Object.create(null);

    private _grammer: Grammer[];
    private _activeDocumentPath: string;

    private _diagnosticMap = {};
    private _diagnostics: vscode.DiagnosticCollection;

    static FixOnSuggestion: string = "simpletypochecker.fixOnSuggestion";
    private _fixOnSuggestionCommand: vscode.Disposable;

    private onActiveTextEditorChanged(arg: vscode.TextEditor) {
        this._activeDocumentPath = arg.document.fileName;
        this.checkDocument(arg.document);
    }

    private onTextDocumentSaved(arg: vscode.TextDocument) {
        if (arg.fileName != this._activeDocumentPath)
            return;

        this.checkDocument(arg);
    }

    private createDiagnostics(document: vscode.TextDocument) {
        let diagnostics: vscode.Diagnostic[] = [];
        let docText = document.getText();

        // exclude comment line.
        docText = docText.replace(/<!--(.*?)-->/g, "");

        this._grammer.forEach(rule => {
            let positions: [number, number][] = [];
            switch (rule.mode) {
                case CheckMode.CompleteMatch:
                    positions = utils.findAllSubstringPositions(docText, rule.pattern)
                    break;
                case CheckMode.RightHandIncompleteMatch:
                    positions = utils.findAllPostLackSubstringPositions(docText, rule.pattern, rule.arg)
                    break;
                case CheckMode.LeftHandIncompleteMatch:
                    positions = utils.findAllPreLackSubstringPositions(docText, rule.pattern, rule.arg)
                    break;
            }
            positions.forEach(pos => {
                diagnostics.push(utils.createDiagnosticObject(document, pos, rule.message, rule.severity, rule.suggestion));
            });
        });

        this._diagnostics.set(document.uri, diagnostics);
        this._diagnosticMap[document.uri.toString()] = diagnostics;
    }

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.Command[] {
        let diagnostic: vscode.Diagnostic = context.diagnostics[0];
        let details: string[] = diagnostic.message.split(/\r?\n/g);
        let error: string = "";
        let suggestion: string = "";

        if (details.length < 2) {
            return undefined;
        }
        error = document.getText(range);
        suggestion = details[1];

        let commands: vscode.Command[] = [];
        commands.push({
            title: 'Replace with \'' + suggestion + '\'',
            command: DocumentChecker.FixOnSuggestion,
            arguments: [document, diagnostic, error, suggestion]
        });

        return commands;
    }

    private fixWithSuggestion(document: vscode.TextDocument, diagnostic: vscode.Diagnostic, error: string, suggestion: string): any {
        let docError: string = document.getText(diagnostic.range);

        let diagnostics: vscode.Diagnostic[] = this._diagnosticMap[document.uri.toString()];
        let index: number = diagnostics.indexOf(diagnostic);

        diagnostics.splice(index, 1);

        this._diagnosticMap[document.uri.toString()] = diagnostics;
        this._diagnostics.set(document.uri, diagnostics);

        let edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, diagnostic.range, suggestion);
        return vscode.workspace.applyEdit(edit);
    }

    private checkDocument(document: vscode.TextDocument) {
        let d = this._validationDelayer[document.uri.toString()];

        if (!d) {
            d = new Delayer<any>(150);
            this._validationDelayer[document.uri.toString()] = d;
        }
        d.trigger(() => {
            this.createDiagnostics(document);
            delete this._validationDelayer[document.uri.toString()];
        });
    }

    checkActiveDocument() {
        let activeEditor = vscode.window.activeTextEditor;
        if (activeEditor != null && activeEditor.document != null) {
            this._activeDocumentPath = vscode.window.activeTextEditor.document.fileName;
            this.checkDocument(activeEditor.document);
        }
    }

    constructor(grammer: Grammer[]) {
        this._grammer = grammer;
    }

    activate() {
        const self = this;

        this._fixOnSuggestionCommand = vscode.commands.registerCommand(DocumentChecker.FixOnSuggestion, this.fixWithSuggestion.bind(this));

        let subscriptions: vscode.Disposable[] = [];
        vscode.window.onDidChangeActiveTextEditor(this.onActiveTextEditorChanged, this, subscriptions);
        vscode.workspace.onDidSaveTextDocument(this.onTextDocumentSaved, this, subscriptions);

        this._diagnostics = vscode.languages.createDiagnosticCollection('STC');
        vscode.workspace.onDidCloseTextDocument((textDocument) => {
            self._diagnostics.delete(textDocument.uri);
        }, null, subscriptions);

        vscode.languages.registerCodeActionsProvider("markdown", this);
        vscode.languages.registerCodeActionsProvider("plaintext", this);

        this._disposable = vscode.Disposable.from(...subscriptions);

        let activeEditor = vscode.window.activeTextEditor;
        if (activeEditor != null && activeEditor.document != null) {
            this._activeDocumentPath = vscode.window.activeTextEditor.document.fileName;
        }
    }

    dispose() {
        this._fixOnSuggestionCommand.dispose();
        this._disposable.dispose();
    }

}