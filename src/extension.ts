import * as vscode from 'vscode';
import * as restm from 'typed-rest-client/RestClient';

interface RestResult {
	html: string;
	errata_count: number;
	origin_html: string;
	notag_html: string;
}

interface RestMessage {
	result: RestResult;
}

interface RestResponse {
	message: RestMessage;
}

async function correctSpell(text: string, eol: string) {
	// naver api function
	let _correctSpell = async function (toCorrect: string, eol: string) {
		const BASE_URL = 'https://m.search.naver.com/p/csearch/ocontent/util/SpellerProxy?color_blindness=0&q=';
		let rest = new restm.RestClient('vscode-extension');

		try {
			let response = await rest.get<RestResponse>(BASE_URL + encodeURIComponent(toCorrect));
			if (response.statusCode != 200)
				throw new Error(`HTTP Error: ${response.statusCode}`);
			else if (response.result == null)
				throw new Error('HTTP Result is null');

			let corrected = response.result.message.result.notag_html;
			return corrected.replace(/<br>/g, eol).replace(/&lt;/g, '<').replace(/&gt;/g, '>');
		}
		catch (e) {
			console.error((<Error>e).message);
			vscode.window.showErrorMessage((<Error>e).message);
			return toCorrect;
		}
	};

	const MAX_TEXT_COUNT = 500;
	let chunk = ((text.length - 1) / MAX_TEXT_COUNT) + 1;
	let correctedText: string = "";

	for (let i = 0; i < chunk; ++i) {
		let from = i * MAX_TEXT_COUNT;
		let length = Math.min(text.length - from, MAX_TEXT_COUNT);

		correctedText += await _correctSpell(text.substr(i * MAX_TEXT_COUNT, length), eol);
	}

	return correctedText;
}

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	let commandCallback = async (editor: vscode.TextEditor) => {
		let document = editor.document;
		let selections = editor.selections;
		const eol = (document.eol == vscode.EndOfLine.LF) ? '\n' : '\r\n';

		if (selections.length == 1 && selections[0].isEmpty) {
			let lastLine = document.lineAt(document.lineCount - 1);
			let lastCharacter = lastLine.range.end.character;
			selections[0] = new vscode.Selection(0, 0, lastLine.lineNumber, lastCharacter);
		}

		for (let i = 0; i < selections.length; ++i) {
			let selection = selections[i];
			let corrected = await correctSpell(document.getText(selection), eol);

			let options = {
				undoStopBefore: (i == 0),
				undoStopAfter: (i == selections.length - 1)
			};

			editor.edit((eb) => eb.replace(selection, corrected), options);
		}
	};

	context.subscriptions.push(vscode.commands.registerTextEditorCommand('speller.correct', commandCallback));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('speller.correct.document', commandCallback));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('speller.correct.selection', commandCallback));
}

// this method is called when your extension is deactivated
export function deactivate() { }
