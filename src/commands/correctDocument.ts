import { ICommand } from '../vscode-util';

export class CorrectDocumentCommand implements ICommand {
	public readonly id = 'speller.correct.document';

	public constructor(
		private readonly _correctCommand: ICommand
	) { }

	public async execute(): Promise<void> {
		return this._correctCommand.execute();
	}
}
