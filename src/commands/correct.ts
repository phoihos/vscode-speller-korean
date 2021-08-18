import * as vscode from 'vscode';

import { ICommand } from '@phoihos/vsce-util';

import { correctText, MAX_CHUNK_SIZE } from '../textCorrector';

interface IProgressContext {
  max: number;
  pos: number;
  step: number;
  ratio: number;
}

export class CorrectCommand implements ICommand {
  public readonly id = 'speller.correct';

  public async execute(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) return;

    const selections = editor.selections;
    const document = editor.document;

    if (selections.length === 1 && selections[0].isEmpty) {
      const lastLine = document.lineAt(document.lineCount - 1);
      const lastCharacter = lastLine.range.end.character;
      selections[0] = new vscode.Selection(0, 0, lastLine.lineNumber, lastCharacter);
    }

    const chunkCount = this._calcChunkCount(editor, selections);
    const progressContext: IProgressContext = {
      max: chunkCount,
      pos: 0,
      step: 0,
      ratio: 100 / chunkCount
    };

    const timerId = setTimeout(() => this._showProgress(progressContext), 500);

    await this._correct(editor, selections, progressContext);

    clearTimeout(timerId);
  }

  private async _correct(
    editor: vscode.TextEditor,
    selections: vscode.Selection[],
    progressContext: IProgressContext
  ): Promise<void> {
    const document = editor.document;
    const eol = document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';

    selections = selections.sort(
      (a, b) => a.start.line - b.start.line || a.start.character - b.start.character
    );

    let i = selections.length;
    while (i--) {
      const selection = selections[i];
      const selectedText = document.getText(selection);
      const correctedText = await correctText(
        selectedText,
        eol,
        () => progressContext.step++,
        vscode.window.showErrorMessage
      );

      if (correctedText === selectedText) continue;

      const options = {
        undoStopBefore: i === selections.length - 1,
        undoStopAfter: i === 0
      };

      await editor.edit((eb) => eb.replace(selection, correctedText), options);
    }
  }

  private _calcChunkCount(editor: vscode.TextEditor, selections: vscode.Selection[]): number {
    const document = editor.document;

    let chunk = 0;
    let i = selections.length;
    while (i--) {
      const selection = selections[i];
      chunk += Math.floor((document.getText(selection).length - 1) / MAX_CHUNK_SIZE) + 1;
    }
    return chunk;
  }

  private _showProgress(progressContext: IProgressContext): void {
    const options: vscode.ProgressOptions = {
      title: 'Speller for Korean: Correcting...',
      location: vscode.ProgressLocation.Notification
    };

    vscode.window.withProgress(options, async (progress) => {
      do {
        if (progressContext.step > 0) {
          progress.report({ increment: progressContext.step * progressContext.ratio });
          progressContext.pos += progressContext.step;
          progressContext.step = 0;
        }

        await this._sleep(100);
      } while (progressContext.pos < progressContext.max);

      await this._sleep(100);
    });
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
