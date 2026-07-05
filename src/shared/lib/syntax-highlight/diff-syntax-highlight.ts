import type { ParsedFileDiff } from "@/shared/lib/parse-unified-diff";
import { getDiffLineTokenKey } from "./diff-line-token-key";
import { getLanguageFromPath } from "./language-from-path";
import {
  syntaxHighlighter,
  type SyntaxTheme,
  type SyntaxToken,
} from "./syntax-highlighter";

const VIEWPORT_MARGIN_PX = 240;

const isInViewport = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return (
    rect.bottom >= -VIEWPORT_MARGIN_PX &&
    rect.top <= window.innerHeight + VIEWPORT_MARGIN_PX
  );
};

export type DiffSyntaxLine = {
  type: string;
  text: string;
  oldLine: number | null;
  newLine: number | null;
};

export class DiffSyntaxHighlight {
  private isVisible = false;
  private lineTokens = new Map<string, SyntaxToken[]>();
  private parsed: ParsedFileDiff | null = null;
  private theme: SyntaxTheme | null = null;
  private highlightGeneration = 0;
  private readonly listeners = new Set<() => void>();
  private disconnectVisibility: (() => void) | null = null;

  constructor(
    private readonly newPath: string,
    private readonly oldPath: string,
  ) {}

  get language() {
    return (
      getLanguageFromPath(this.newPath) ?? getLanguageFromPath(this.oldPath)
    );
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.highlightGeneration += 1;
    this.disconnectVisibility?.();
    this.disconnectVisibility = null;
    this.listeners.clear();
  }

  attachRoot(element: HTMLElement): () => void {
    this.disconnectVisibility?.();

    // `display: contents` has no layout box, so observe the parent container.
    const observeTarget = element.parentElement ?? element;

    const markVisible = () => {
      if (this.isVisible) {
        return;
      }

      this.isVisible = true;
      void this.runHighlight();
    };

    if (isInViewport(observeTarget)) {
      markVisible();
      this.disconnectVisibility = () => {};
      return () => this.disconnectVisibility?.();
    }

    if (typeof IntersectionObserver === "undefined") {
      markVisible();
      this.disconnectVisibility = () => {};
      return () => this.disconnectVisibility?.();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          markVisible();
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: `${VIEWPORT_MARGIN_PX}px 0px`,
        threshold: 0,
      },
    );

    observer.observe(observeTarget);

    this.disconnectVisibility = () => observer.disconnect();
    return () => {
      this.disconnectVisibility?.();
      this.disconnectVisibility = null;
    };
  }

  setContent(parsed: ParsedFileDiff | null, theme: SyntaxTheme): void {
    this.parsed = parsed;
    this.theme = theme;
    void this.runHighlight();
  }

  getLineTokens(line: DiffSyntaxLine): SyntaxToken[] | null {
    if (line.type === "no-newline") {
      return null;
    }

    const key = getDiffLineTokenKey(line);
    if (key.endsWith(":null")) {
      return null;
    }

    return this.lineTokens.get(key) ?? null;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private async runHighlight(): Promise<void> {
    const { parsed, theme, language } = this;
    if (!parsed || !language || !this.isVisible || !theme) {
      return;
    }

    const generation = ++this.highlightGeneration;

    const tokens = await syntaxHighlighter.highlightParsedDiffLines(
      parsed,
      language,
      theme,
    );

    if (generation !== this.highlightGeneration) {
      return;
    }

    this.lineTokens = tokens;
    this.notify();
  }
}
