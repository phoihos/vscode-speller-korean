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

async function fixSpell(text: string, eol: string) {
	// naver api function
	let _fixSpell = async function (toFix: string, eol: string) {
		const BASE_URL = 'https://m.search.naver.com/p/csearch/ocontent/util/SpellerProxy?color_blindness=0&q=';
		let rest = new restm.RestClient('vscode-extension');

		try {
			let response = await rest.get<RestResponse>(BASE_URL + encodeURIComponent(toFix));
			if (response.statusCode != 200)
				throw new Error(`HTTP Error: ${response.statusCode}`);
			else if (response.result == null)
				throw new Error('HTTP Result is null');

			let fixed = response.result.message.result.notag_html;
			return fixed.replace(/<br>/g, eol).replace(/&lt;/g, '<').replace(/&gt;/g, '>');
		}
		catch (e) {
			console.error((<Error>e).message);
			vscode.window.showErrorMessage((<Error>e).message);
			return toFix;
		}
	};

	const MAX_TEXT_COUNT = 500;
	let chunk = ((text.length - 1) / MAX_TEXT_COUNT) + 1;
	let fixedText: string = "";

	for (let i = 0; i < chunk; ++i) {
		let from = i * MAX_TEXT_COUNT;
		let length = Math.min(text.length - from, MAX_TEXT_COUNT);

		fixedText += await _fixSpell(text.substr(i * MAX_TEXT_COUNT, length), eol);
	}

	return fixedText;
}

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('speller.fix', async () => {
		let editor = vscode.window.activeTextEditor;
		if (editor == undefined)
			return;

		let document = editor.document;
		let eol = document.eol == vscode.EndOfLine.LF ? '\n' : '\r\n';
		let selections = editor.selections;

		if (selections.length == 1 && selections[0].isEmpty) {
			let lastLine = document.lineAt(document.lineCount - 1);
			let lastCharacter = lastLine.range.end.character;
			selections[0] = new vscode.Selection(0, 0, lastLine.lineNumber, lastCharacter);
		}

		for (let i = 0; i < selections.length; ++i) {
			let selection = selections[i];
			let fixed = await fixSpell(document.getText(selection), eol);

			let options = {
				undoStopBefore: (i == 0),
				undoStopAfter: (i == selections.length - 1)
			};

			editor.edit((eb) => eb.replace(selection, fixed), options);
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
