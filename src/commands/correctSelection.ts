import { Command } from '@phoihos/vsce-util';

export class CorrectSelectionCommand implements Command {
  public readonly id = 'speller.correct.selection';

  public constructor(private readonly _correctCommand: Command) {}

  public async execute(): Promise<void> {
    return this._correctCommand.execute();
  }
}
