'use strict';

import * as vscode from 'vscode'

export function isEmptyOrSpaces(str: string): boolean {
    return str === null || str.match(/^ *$/) !== null;
}

export function findAllSubstringPositions(str: string, pattern: string): [number, number][] {
    let positions: [number, number][] = [];
    let re = new RegExp(pattern, "g");
    let match: RegExpExecArray = null;
    while ((match = re.exec(str)) != null) {
        positions.push([match.index, match.index + match[0].length]);
    }
    return positions;
}

export function findAllPreLackSubstringPositions(str: string, pattern: string, arg: string): [number, number][] {
    let subPositions = findAllSubstringPositions(str, pattern);
    if (subPositions.length == 0)
        return [];
    let completePositions = findAllSubstringPositions(str, arg + pattern);
    if (completePositions.length == 0) {
        return subPositions;
    }

    let positions: [number, number][] = [];
    let i = 0, j = 0;
    
    while (i < subPositions.length) {
        if (subPositions[i][1] < completePositions[j][1]) {
            positions.push(subPositions[i]); // this is an error case
            i++; continue;
        }
        if (subPositions[i][1] == completePositions[j][1]) {
            // ok , match!
            i++;
            if (j + 1 < completePositions.length) j++;
        } else {
            positions.push(subPositions[i]); // this is an error case
            i++;
        }
    }
    return positions;
}

export function findAllPostLackSubstringPositions(str: string, pattern: string, arg: string): [number, number][] {
    let subPositions = findAllSubstringPositions(str, pattern);
    if (subPositions.length == 0)
        return [];
    let completePositions = findAllSubstringPositions(str, pattern + arg);
    if (completePositions.length == 0) {
        return subPositions;
    }

    let positions: [number, number][] = [];
    let i = 0, j = 0;

    while (i < subPositions.length) {
        if (subPositions[i][0] < completePositions[j][0]) {
            positions.push(subPositions[i]); // this is an error case
            i++; continue;
        }
        if (subPositions[i][0] == completePositions[j][0]) {
            // ok , match!
            i++;
            if (j + 1 < completePositions.length) j++;
        } else {
            positions.push(subPositions[i]); // this is an error case
            i++;
        }
    }
    return positions;
}

export function createDiagnosticObject(document: vscode.TextDocument, pos: [number, number], message: string, severity: SeverityType, suggest: string) {
    message = message.replace(/\r?\n/g, '');
    suggest = suggest.replace(/\r?\n/g, '');
    if (!isEmptyOrSpaces(suggest)) {
        message = `${message}\n${suggest}`;
    }

    let startPos = document.positionAt(pos[0]);
    let endPos = document.positionAt(pos[1]);
    let range = new vscode.Range(startPos, endPos);
    let diag = new vscode.Diagnostic(range, message, convertSeverityType(severity));
    return diag;
}

export function convertSeverityType(type: SeverityType): vscode.DiagnosticSeverity {
    switch (type) {
        case SeverityType.Info:
            return vscode.DiagnosticSeverity.Information;
        case SeverityType.Warn:
            return vscode.DiagnosticSeverity.Warning;
        case SeverityType.Error:
            return vscode.DiagnosticSeverity.Error;
        case SeverityType.Hint:
        default:
            return vscode.DiagnosticSeverity.Hint;
    }
}
