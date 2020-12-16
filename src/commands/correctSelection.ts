import { ICommand } from '../commandManager';
import { CorrectCommand } from './correct'

export class CorrectSelectionCommand implements ICommand {
	public readonly id = 'speller.correct.selection';

	public constructor(
		private readonly _correctCommand: CorrectCommand
	) { }

	public execute(): Promise<void> {
		return this._correctCommand.execute();
	}
}
