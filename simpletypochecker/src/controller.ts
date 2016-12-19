/// <reference path="../typings/node.d.ts"/>
/// <reference path="../typings/simpletypochecker/grammer.d.ts"/>
/// <reference path="./utils.ts"/>

'use strict';

import * as vscode from 'vscode';
import * as events from 'events';

import DocumentChecker from './checker';
import * as utils from './utils';

var path = require('path');
var fs = require('fs');

export default class Controller implements vscode.Disposable {

    private _enabled: boolean = false;
    private _checker: DocumentChecker;

    private _extensionContext: vscode.ExtensionContext;
    private _eventEmitter: events.EventEmitter = new events.EventEmitter();

    private _statusBarItem: vscode.StatusBarItem;

    static DoCheckCommand: string = "simpletypochecker.checkDocument";
    static EnableCheckerCommand: string = "simpletypochecker.enable";
    static DisableCheckerCommand: string = "simpletypochecker.disable";

    private registerCommand(command: string) {
        const self = this;
        this._extensionContext.subscriptions.push(vscode.commands.registerCommand(command, () => {
            self._eventEmitter.emit(command);
        }));
    }

    private checkDocument() {
        if (!this._enabled) {
            vscode.window.showErrorMessage('You have to start SimpleTypoChecker before you check the document.');
            return;
        }

        this._checker.checkActiveDocument();
        vscode.window.showInformationMessage('SimpleTypoChecker has checked the active document.');
    }

    private startChecker() {
        if (this._enabled) {
            vscode.window.showErrorMessage('SimpleTypoChecker has already started.');
            return;
        }

        let config = vscode.workspace.getConfiguration('simpletypochecker');

        var grammerFilePath: string = config['grammer'] || "";

        if (utils.isEmptyOrSpaces(grammerFilePath)) {
            vscode.window.showErrorMessage('You need to set up the configuration in your User Settings before you use this extension.');
            return;
        }

        try {
            fs.accessSync(grammerFilePath);
        } catch (e) {
            vscode.window.showErrorMessage('Grammer file path you specified in the configuration was invalid. File not found.');
            return;
        }

        try {
            let obj = JSON.parse(fs.readFileSync(grammerFilePath, 'utf8'));
            let grammers: Grammer[] = obj;
            this._checker = new DocumentChecker(grammers);
        }
        catch (e) {
            vscode.window.showErrorMessage('An error has occured while parsing grammer file.');
            return;
        }

        this._checker.activate();
        this._enabled = true;
        this._checker.checkActiveDocument();
        this.updateCheckerStatus();
    }

    private stopChecker() {
        if (!this._enabled) {
            vscode.window.showErrorMessage('SimpleTypoChecker hasn\'t started.');
            return;
        }

        this._checker.dispose();
        this._checker = null;
        this._enabled = false;
        this.updateCheckerStatus();
    }

    private updateCheckerStatus() {
        if (!this._statusBarItem) {
            return;
        }

        if (this._enabled) {
            this._statusBarItem.text = "$(eye) STC Enabled";
            this._statusBarItem.show();
        } else {
            this._statusBarItem.hide();
        }
    }

    constructor(context: vscode.ExtensionContext) {
        this._extensionContext = context;
        if (!this._statusBarItem) {
            this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        }
    }

    activate() {
        const self = this;

        this.registerCommand(Controller.DoCheckCommand);
        this.registerCommand(Controller.EnableCheckerCommand);
        this.registerCommand(Controller.DisableCheckerCommand);

        this._eventEmitter.on(Controller.DoCheckCommand, () => { self.checkDocument(); });
        this._eventEmitter.on(Controller.EnableCheckerCommand, () => { self.startChecker(); });
        this._eventEmitter.on(Controller.DisableCheckerCommand, () => { self.stopChecker(); });
    }

    dispose() {
        if (this._checker) {
            this._checker.dispose();
        }
    }
}