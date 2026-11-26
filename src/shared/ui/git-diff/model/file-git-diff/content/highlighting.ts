import { actionBound, autorun, observableRef, runInAction } from 'mobx';
import { DiffSyntaxHighlight } from '@/shared/lib/syntax-highlight/diff-syntax-highlight';
import type { FileGitDiff } from '..';

export class FileDiffHighlighting {
  private detach?: () => void;
  @observableRef accessor tokens: Pick<
    DiffSyntaxHighlight,
    'getLineTokens'
  > | null = null;

  constructor(private readonly file: FileGitDiff) {}

  @actionBound attach(element: HTMLDivElement | null) {
    this.detach?.();
    this.detach = undefined;
    this.tokens = null;
    if (!element) return;

    const engine = new DiffSyntaxHighlight(
      this.file.change.new_path,
      this.file.change.old_path,
    );
    engine.subscribe(() =>
      runInAction(() => {
        this.tokens = { getLineTokens: (line) => engine.getLineTokens(line) };
      }),
    );
    engine.attachRoot(element);
    const stop = autorun(() =>
      engine.setContent(
        this.file.content.parsed,
        this.file.parent.globals.stores.theme.syntaxTheme,
      ),
    );
    this.detach = () => {
      stop();
      engine.dispose();
    };
  }
}
