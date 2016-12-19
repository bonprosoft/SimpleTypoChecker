'use strict';

import * as vscode from 'vscode';
import Controller from './controller';

export function activate(context: vscode.ExtensionContext) {
	let controller = new Controller(context);
 	context.subscriptions.push(controller); 	
 	controller.activate();	
}

export function deactivate() {

}