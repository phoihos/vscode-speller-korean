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

interface ProgressContext {
	ratio: number;
	corrected: number;
	accumulated: number;
}

const API_BASE_URL = 'https://m.search.naver.com/p/csearch/ocontent/util/SpellerProxy?color_blindness=0&q=';
const MAX_TEXT_COUNT = 500;

async function correctSpell(text: string, eol: string, progressContext: ProgressContext) {
	const _correctSpell = async (textChunk: string) => {
		const _unescape = (str: string) => {
			return str.replace(/<br>/g, eol)
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&quot;/g, '"');
		}

		try {
			let rest = new restm.RestClient('vscode-extension');
			let response = await rest.get<RestResponse>(API_BASE_URL + encodeURIComponent(textChunk));
			if (response.statusCode != 200)
				throw new Error(`HTTP Error: ${response.statusCode}`);
			else if (response.result == null)
				throw new Error('HTTP Result is null');

			return _unescape(response.result.message.result.notag_html);
		}
		catch (e) {
			console.error((<Error>e).message);
			vscode.window.showErrorMessage((<Error>e).message);

			return textChunk;
		}
	};

	let chunk = Math.floor((text.length - 1) / MAX_TEXT_COUNT) + 1;
	let correctedText: string = "";

	for (let i = 0; i < chunk; ++i) {
		let from = i * MAX_TEXT_COUNT;
		let length = Math.min(text.length - from, MAX_TEXT_COUNT);

		progressContext.corrected++;
		correctedText += await _correctSpell(text.substr(i * MAX_TEXT_COUNT, length));
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

		let chunk = 0;

		let i = selections.length;
		while (i--) {
			let selection = selections[i];
			chunk += Math.floor((document.getText(selection).length - 1) / MAX_TEXT_COUNT) + 1;
		}

		let progressContext: ProgressContext = {
			ratio: (100 / chunk),
			corrected: 0,
			accumulated: 0
		};

		let timerId = setTimeout(() => {
			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				cancellable: false,
				title: 'Speller for Korean: Correcting...'
			}, async (progress) => {
				const _update = (resolve: any) => {
					let prev = progressContext.accumulated;
					progressContext.accumulated += (progressContext.corrected * progressContext.ratio);
					progressContext.corrected = 0;

					progress.report({ increment: (progressContext.accumulated - prev) });

					if (progressContext.accumulated >= 99.9) setTimeout(() => resolve(), 200);
					else setTimeout(() => _update(resolve), 100);
				};

				await (new Promise(_update));
			});

		}, 1000);

		i = selections.length;
		while (i--) {
			let selection = selections[i];
			let corrected = await correctSpell(document.getText(selection), eol, progressContext);

			let options = {
				undoStopBefore: (i == selections.length - 1),
				undoStopAfter: (i == 0)
			};

			await editor.edit((eb) => eb.replace(selection, corrected), options);
		}

		clearTimeout(timerId);
	};

	context.subscriptions.push(vscode.commands.registerTextEditorCommand('speller.correct', commandCallback));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('speller.correct.document', commandCallback));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('speller.correct.selection', commandCallback));
}

// this method is called when your extension is deactivated
export function deactivate() { }
