import { bundledLanguages } from "shiki/bundle/web";
import { createHighlighter } from "shiki/bundle/web";
import type { BundledLanguage, BundledTheme, Highlighter } from "shiki/bundle/web";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { ParsedFileDiff } from "@/shared/lib/parse-unified-diff";
import { getDiffLineTokenKey } from "./diff-line-token-key";
import type { SyntaxLanguage } from "./supported-languages";

export type SyntaxTheme = Extract<BundledTheme, "github-light" | "github-dark">;

export interface SyntaxToken {
  content: string;
  color?: string;
  fontStyle?: number;
}

export type SyntaxLineTokens = Map<number, SyntaxToken[]>;

type LanguageLoader = () => Promise<{ default: unknown }>;

const THEMES: SyntaxTheme[] = ["github-light", "github-dark"];

const EXTENDED_LANGUAGE_LOADERS: Record<string, LanguageLoader> = {
  clojure: () => import("@shikijs/langs/clojure"),
  cmake: () => import("@shikijs/langs/cmake"),
  crystal: () => import("@shikijs/langs/crystal"),
  csharp: () => import("@shikijs/langs/csharp"),
  dart: () => import("@shikijs/langs/dart"),
  docker: () => import("@shikijs/langs/docker"),
  dockerfile: () => import("@shikijs/langs/dockerfile"),
  elixir: () => import("@shikijs/langs/elixir"),
  erlang: () => import("@shikijs/langs/erlang"),
  fsharp: () => import("@shikijs/langs/fsharp"),
  gdscript: () => import("@shikijs/langs/gdscript"),
  go: () => import("@shikijs/langs/go"),
  groovy: () => import("@shikijs/langs/groovy"),
  haskell: () => import("@shikijs/langs/haskell"),
  hcl: () => import("@shikijs/langs/hcl"),
  ini: () => import("@shikijs/langs/ini"),
  kotlin: () => import("@shikijs/langs/kotlin"),
  lua: () => import("@shikijs/langs/lua"),
  makefile: () => import("@shikijs/langs/makefile"),
  matlab: () => import("@shikijs/langs/matlab"),
  nginx: () => import("@shikijs/langs/nginx"),
  nim: () => import("@shikijs/langs/nim"),
  nix: () => import("@shikijs/langs/nix"),
  "objective-c": () => import("@shikijs/langs/objective-c"),
  ocaml: () => import("@shikijs/langs/ocaml"),
  perl: () => import("@shikijs/langs/perl"),
  powershell: () => import("@shikijs/langs/powershell"),
  proto: () => import("@shikijs/langs/proto"),
  protobuf: () => import("@shikijs/langs/protobuf"),
  raku: () => import("@shikijs/langs/raku"),
  ruby: () => import("@shikijs/langs/ruby"),
  rust: () => import("@shikijs/langs/rust"),
  scala: () => import("@shikijs/langs/scala"),
  solidity: () => import("@shikijs/langs/solidity"),
  swift: () => import("@shikijs/langs/swift"),
  terraform: () => import("@shikijs/langs/terraform"),
  toml: () => import("@shikijs/langs/toml"),
  vb: () => import("@shikijs/langs/vb"),
  zig: () => import("@shikijs/langs/zig"),
};

export class SyntaxHighlighter {
  private highlighterPromise: Promise<Highlighter> | null = null;
  private highlightQueue: Promise<unknown> = Promise.resolve();
  private readonly lineCache = new Map<string, SyntaxLineTokens>();
  private readonly parsedDiffCache = new Map<string, Map<string, SyntaxToken[]>>();
  private readonly loadedLanguages = new Set<string>();

  preload(): void {
    void this.getHighlighter();
  }

  isSupportedLanguage(lang: string): boolean {
    return this.getLanguageLoader(lang) !== null;
  }

  async highlightContentToLineTokens(
    content: string,
    lang: SyntaxLanguage,
    theme: SyntaxTheme,
  ): Promise<SyntaxLineTokens> {
    return this.scheduleHighlight(() =>
      this.highlightContentToLineTokensInternal(content, lang, theme),
    );
  }

  async highlightCodeBlockTokens(
    content: string,
    lang: SyntaxLanguage,
    theme: SyntaxTheme,
  ): Promise<SyntaxToken[][]> {
    return this.scheduleHighlight(() =>
      this.highlightCodeBlockTokensInternal(content, lang, theme),
    );
  }

  async highlightLineText(
    text: string,
    lang: SyntaxLanguage,
    theme: SyntaxTheme,
  ): Promise<SyntaxToken[]> {
    const lines = await this.highlightCodeBlockTokens(text, lang, theme);
    return lines[0] ?? [{ content: text || " " }];
  }

  async highlightParsedDiffLines(
    parsed: ParsedFileDiff,
    lang: SyntaxLanguage,
    theme: SyntaxTheme,
  ): Promise<Map<string, SyntaxToken[]>> {
    return this.scheduleHighlight(async () => {
      const cacheKey = this.buildParsedDiffCacheKey(parsed, lang, theme);
      const cached = this.parsedDiffCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const result = new Map<string, SyntaxToken[]>();

      for (const hunk of parsed.hunks) {
        const lines = hunk.lines.filter((line) => line.type !== "no-newline");
        if (lines.length === 0) {
          continue;
        }

        const text = lines.map((line) => line.text).join("\n");
        const tokenLines = await this.highlightCodeBlockTokensInternal(
          text,
          lang,
          theme,
        );

        for (const [index, line] of lines.entries()) {
          const key = getDiffLineTokenKey(line);
          if (key.endsWith(":null")) {
            continue;
          }

          result.set(key, tokenLines[index] ?? [{ content: line.text || " " }]);
        }
      }

      this.parsedDiffCache.set(cacheKey, result);
      this.trimCache(this.parsedDiffCache, 48);

      return result;
    });
  }

  renderTokensToHtml(lines: SyntaxToken[][]): string {
    return lines
      .map((line) => line.map((token) => this.renderToken(token)).join(""))
      .join("\n");
  }

  private getLanguageLoader(lang: string): LanguageLoader | null {
    if (lang in bundledLanguages) {
      return bundledLanguages[lang as keyof typeof bundledLanguages];
    }

    return EXTENDED_LANGUAGE_LOADERS[lang] ?? null;
  }

  private scheduleHighlight<T>(task: () => Promise<T>): Promise<T> {
    const run = this.highlightQueue.then(task, task);
    this.highlightQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private getHighlighter() {
    if (!this.highlighterPromise) {
      this.highlighterPromise = createHighlighter({
        themes: THEMES,
        langs: [],
        engine: createJavaScriptRegexEngine(),
      });
    }

    return this.highlighterPromise;
  }

  private async ensureLanguage(lang: SyntaxLanguage) {
    const highlighter = await this.getHighlighter();

    if (highlighter.getLoadedLanguages().includes(lang)) {
      return true;
    }

    if (this.loadedLanguages.has(lang)) {
      return true;
    }

    const loader = this.getLanguageLoader(lang);
    if (!loader) {
      return false;
    }

    const registration = await loader();
    await highlighter.loadLanguage(
      registration as Parameters<Highlighter["loadLanguage"]>[0],
    );
    this.loadedLanguages.add(lang);

    return true;
  }

  private splitFileLines(content: string) {
    const lines = content.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }

    return lines;
  }

  private buildCacheKey(
    content: string,
    lang: SyntaxLanguage,
    theme: SyntaxTheme,
  ) {
    return `${theme}:${lang}:${content.length}:${content.slice(0, 64)}:${content.slice(-64)}`;
  }

  private buildParsedDiffCacheKey(
    parsed: ParsedFileDiff,
    lang: SyntaxLanguage,
    theme: SyntaxTheme,
  ) {
    const parts: string[] = [theme, lang];

    for (const hunk of parsed.hunks) {
      parts.push(hunk.header);
      for (const line of hunk.lines) {
        if (line.type === "no-newline") {
          continue;
        }

        parts.push(
          `${line.type}:${line.oldLine ?? ""}:${line.newLine ?? ""}:${line.text}`,
        );
      }
    }

    return parts.join("\0");
  }

  private trimCache<K, V>(cache: Map<K, V>, maxSize: number) {
    while (cache.size > maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }

      cache.delete(oldestKey);
    }
  }

  private async tokenizeSource(
    source: string,
    lang: SyntaxLanguage,
    theme: SyntaxTheme,
  ) {
    const highlighter = await this.getHighlighter();
    const { tokens } = highlighter.codeToTokens(source, {
      lang: lang as BundledLanguage,
      theme,
    });

    return tokens.map((line) =>
      line.map((token) => ({
        content: token.content,
        color: token.color,
        fontStyle: token.fontStyle,
      })),
    );
  }

  private async highlightContentToLineTokensInternal(
    content: string,
    lang: SyntaxLanguage,
    theme: SyntaxTheme,
  ): Promise<SyntaxLineTokens> {
    const cacheKey = this.buildCacheKey(content, lang, theme);
    const cached = this.lineCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const isLoaded = await this.ensureLanguage(lang);
    if (!isLoaded) {
      return new Map();
    }

    const fileLines = this.splitFileLines(content);
    const source = fileLines.join("\n");
    const tokenLines = await this.tokenizeSource(source, lang, theme);

    const lineTokens: SyntaxLineTokens = new Map();

    for (const [index, line] of tokenLines.entries()) {
      lineTokens.set(index + 1, line);
    }

    this.lineCache.set(cacheKey, lineTokens);
    this.trimCache(this.lineCache, 24);

    return lineTokens;
  }

  private async highlightCodeBlockTokensInternal(
    content: string,
    lang: SyntaxLanguage,
    theme: SyntaxTheme,
  ): Promise<SyntaxToken[][]> {
    const isLoaded = await this.ensureLanguage(lang);
    if (!isLoaded) {
      return [];
    }

    return this.tokenizeSource(content, lang, theme);
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  private renderToken(token: SyntaxToken) {
    const styles: string[] = [];

    if (token.color) {
      styles.push(`color:${token.color}`);
    }

    if (token.fontStyle && token.fontStyle & 1) {
      styles.push("font-style:italic");
    }

    if (token.fontStyle && token.fontStyle & 2) {
      styles.push("font-weight:bold");
    }

    if (token.fontStyle && token.fontStyle & 4) {
      styles.push("text-decoration:underline");
    }

    const styleAttr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";
    return `<span${styleAttr}>${this.escapeHtml(token.content)}</span>`;
  }
}

export const syntaxHighlighter = new SyntaxHighlighter();
