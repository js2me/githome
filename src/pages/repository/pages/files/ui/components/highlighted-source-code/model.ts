import { action, observable, reaction, runInAction } from "mobx";
import { VM } from "@/shared/lib/view-models/vm";
import { getLanguageFromPath } from "@/shared/lib/syntax-highlight/language-from-path";
import { renderSyntaxTokensToHtml } from "@/shared/lib/syntax-highlight/render-syntax-html";
import { highlightCodeBlockTokens } from "@/shared/lib/syntax-highlight/shiki-highlighter";

export interface HighlightedSourceCodePayload {
  filePath: string;
  content: string;
}

export class HighlightedSourceCodeVM extends VM<HighlightedSourceCodePayload> {
  @observable accessor html: string | null = null;
  @observable accessor usePlainText = true;
  @observable accessor isHighlighting = false;

  private highlightGeneration = 0;

  willMount() {
    reaction(
      () => ({
        content: this.payload.content,
        filePath: this.payload.filePath,
        isDark: this.globals.stores.theme.isDark,
      }),
      () => {
        void this.highlight();
      },
      { fireImmediately: true },
    );
  }

  @action.bound
  private async highlight() {
    const generation = ++this.highlightGeneration;
    const { content, filePath } = this.payload;
    const language = getLanguageFromPath(filePath);

    if (!content || !language) {
      this.html = null;
      this.usePlainText = true;
      this.isHighlighting = false;
      return;
    }

    this.isHighlighting = true;
    this.usePlainText = false;
    this.html = null;

    try {
      const lines = await highlightCodeBlockTokens(
        content,
        language,
        this.globals.stores.theme.syntaxTheme,
      );

      if (generation !== this.highlightGeneration) {
        return;
      }

      runInAction(() => {
        if (lines.length === 0) {
          this.html = null;
          this.usePlainText = true;
        } else {
          this.html = renderSyntaxTokensToHtml(lines);
          this.usePlainText = false;
        }

        this.isHighlighting = false;
      });
    } catch {
      if (generation !== this.highlightGeneration) {
        return;
      }

      runInAction(() => {
        this.html = null;
        this.usePlainText = true;
        this.isHighlighting = false;
      });
    }
  }
}
