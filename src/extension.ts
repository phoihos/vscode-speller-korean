// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import vsceUtil from '@phoihos/vsce-util';
import commands from './commands';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(registerCommands());
}

function registerCommands(): vscode.Disposable {
  const commandManager = new vsceUtil.CommandManager();

  const correctCommand = commandManager.register(new commands.CorrectCommand());
  commandManager.register(new commands.CorrectDocumentCommand(correctCommand));
  commandManager.register(new commands.CorrectSelectionCommand(correctCommand));

  return commandManager;
}

// this method is called when your extension is deactivated
export function deactivate() {}
