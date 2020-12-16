import { ICommand } from '../commandManager';
import { CorrectCommand } from './correct'

export class CorrectDocumentCommand implements ICommand {
	public readonly id = 'speller.correct.document';

	public constructor(
		private readonly _correctCommand: CorrectCommand
	) { }

	public execute(): Promise<void> {
		return this._correctCommand.execute();
	}
}
