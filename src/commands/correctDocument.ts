import { Command } from '@phoihos/vsce-util';

export class CorrectDocumentCommand implements Command {
  public readonly id = 'speller.correct.document';

  public constructor(private readonly _correctCommand: Command) {}

  public async execute(): Promise<void> {
    return this._correctCommand.execute();
  }
}
