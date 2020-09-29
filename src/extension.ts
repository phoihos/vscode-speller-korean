// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { correctText, MAX_CHUNK_SIZE } from './textCorrector'
import { sleep } from './utils'

interface IProgressContext {
	max: number;
	pos: number;
	step: number;
	ratio: number;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const commandCallback = async (editor: vscode.TextEditor) => {
		const document = editor.document;
		const selections = editor.selections;
		const eol = (document.eol == vscode.EndOfLine.LF) ? '\n' : '\r\n';

		if (selections.length == 1 && selections[0].isEmpty) {
			const lastLine = document.lineAt(document.lineCount - 1);
			const lastCharacter = lastLine.range.end.character;
			selections[0] = new vscode.Selection(0, 0, lastLine.lineNumber, lastCharacter);
		}

		let chunk = 0;

		let i = selections.length;
		while (i--) {
			const selection = selections[i];
			chunk += Math.floor((document.getText(selection).length - 1) / MAX_CHUNK_SIZE) + 1;
		}

		const progressContext: IProgressContext = {
			max: chunk,
			pos: 0,
			step: 0,
			ratio: (100 / chunk)
		};

		const timerId = setTimeout(() => {
			vscode.window.withProgress({
				title: 'Speller for Korean: Correcting...',
				location: vscode.ProgressLocation.Notification
			}, async (progress) => {
				do {
					if (progressContext.step > 0) {
						progress.report({ increment: (progressContext.step * progressContext.ratio) });
						progressContext.pos += progressContext.step;
						progressContext.step = 0;
					}

					await sleep(100);

				} while (progressContext.pos < progressContext.max);

				await sleep(100);
			});

		}, 1000);

		i = selections.length;
		while (i--) {
			const selection = selections[i];
			const selectedText = document.getText(selection);
			const correctedText = await correctText(selectedText, eol,
				() => progressContext.step++, vscode.window.showErrorMessage);

			if (correctedText == selectedText)
				continue;

			const options = {
				undoStopBefore: (i == selections.length - 1),
				undoStopAfter: (i == 0)
			};

			await editor.edit((eb) => eb.replace(selection, correctedText), options);
		}

		clearTimeout(timerId);
	};

	context.subscriptions.push(vscode.commands.registerTextEditorCommand('speller.correct', commandCallback));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('speller.correct.document', commandCallback));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('speller.correct.selection', commandCallback));
}

// this method is called when your extension is deactivated
export function deactivate() { }
