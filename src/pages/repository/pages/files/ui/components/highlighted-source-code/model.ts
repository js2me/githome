import { actionBound, observableRef, reaction, runInAction } from 'mobx';
import { getLanguageFromPath } from '@/shared/lib/syntax-highlight/language-from-path';
import type { SyntaxToken } from '@/shared/lib/syntax-highlight/shiki-highlighter';
import { highlightCodeBlockTokens } from '@/shared/lib/syntax-highlight/shiki-highlighter';
import { VM } from '@/shared/lib/view-models/vm';

export interface HighlightedSourceCodePayload {
  filePath: string;
  content: string;
}

export class HighlightedSourceCodeVM extends VM<HighlightedSourceCodePayload> {
  @observableRef accessor tokens: Array<
    SyntaxToken & { offset: number }
  > | null = null;
  private highlightGeneration = 0;

  willMount() {
    reaction(
      () => ({
        content: this.payload.content,
        filePath: this.payload.filePath,
        theme: this.globals.stores.theme.syntaxTheme,
      }),
      () => {
        void this.highlight();
      },
      { fireImmediately: true, signal: this.unmountSignal },
    );
  }

  @actionBound
  private async highlight() {
    const generation = ++this.highlightGeneration;
    const { content, filePath } = this.payload;
    const language = getLanguageFromPath(filePath);

    this.tokens = null;
    if (!content || !language) return;

    try {
      const lines = await highlightCodeBlockTokens(
        content,
        language,
        this.globals.stores.theme.syntaxTheme,
      );
      if (
        generation === this.highlightGeneration &&
        !this.unmountSignal.aborted
      ) {
        runInAction(() => {
          const tokens: Array<SyntaxToken & { offset: number }> = [];
          let offset = 0;
          for (const [lineIndex, line] of lines.entries()) {
            if (lineIndex > 0) tokens.push({ content: '\n', offset: offset++ });
            for (const token of line) {
              if (!token.content) continue;
              tokens.push({ ...token, offset });
              offset += token.content.length;
            }
          }
          this.tokens = tokens.length ? tokens : null;
        });
      }
    } catch {
      // Keep the source visible as plain text when tokenization fails.
    }
  }
}
