import { ICommand } from '@phoihos/vsce-util';

export class CorrectSelectionCommand implements ICommand {
	public readonly id = 'speller.correct.selection';

	public constructor(
		private readonly _correctCommand: ICommand
	) { }

	public async execute(): Promise<void> {
		return this._correctCommand.execute();
	}
}
