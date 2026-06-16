import { createHighlighter } from "shiki/bundle/web";
import { bundledLanguages } from "shiki/bundle/web";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { BundledLanguage, BundledTheme, Highlighter } from "shiki/bundle/web";
import type { ParsedFileDiff } from "@/shared/lib/parse-unified-diff";

export type SyntaxTheme = Extract<BundledTheme, "github-light" | "github-dark">;

export interface SyntaxToken {
  content: string;
  color?: string;
  fontStyle?: number;
}

export type SyntaxLineTokens = Map<number, SyntaxToken[]>;

const THEMES: SyntaxTheme[] = ["github-light", "github-dark"];

let highlighterPromise: Promise<Highlighter> | null = null;
const lineCache = new Map<string, SyntaxLineTokens>();
const parsedDiffCache = new Map<string, Map<string, SyntaxToken[]>>();

let highlightQueue: Promise<unknown> = Promise.resolve();

const scheduleHighlight = <T>(task: () => Promise<T>): Promise<T> => {
  const run = highlightQueue.then(task, task);
  highlightQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

const getHighlighter = () => {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: THEMES,
      langs: [],
      engine: createJavaScriptRegexEngine(),
    });
  }

  return highlighterPromise;
};

const ensureLanguage = async (lang: BundledLanguage) => {
  const highlighter = await getHighlighter();

  if (highlighter.getLoadedLanguages().includes(lang)) {
    return true;
  }

  const loader = bundledLanguages[lang];
  if (!loader) {
    return false;
  }

  await highlighter.loadLanguage(await loader());
  return true;
};

const splitFileLines = (content: string) => {
  const lines = content.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines;
};

const buildCacheKey = (
  content: string,
  lang: BundledLanguage,
  theme: SyntaxTheme,
) => `${theme}:${lang}:${content.length}:${content.slice(0, 64)}:${content.slice(-64)}`;

const buildParsedDiffCacheKey = (
  parsed: ParsedFileDiff,
  lang: BundledLanguage,
  theme: SyntaxTheme,
) => {
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
};

const trimCache = <K, V>(cache: Map<K, V>, maxSize: number) => {
  while (cache.size > maxSize) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }

    cache.delete(oldestKey);
  }
};

export const highlightContentToLineTokens = async (
  content: string,
  lang: BundledLanguage,
  theme: SyntaxTheme,
): Promise<SyntaxLineTokens> =>
  scheduleHighlight(() =>
    highlightContentToLineTokensInternal(content, lang, theme),
  );

const highlightContentToLineTokensInternal = async (
  content: string,
  lang: BundledLanguage,
  theme: SyntaxTheme,
): Promise<SyntaxLineTokens> => {
  const cacheKey = buildCacheKey(content, lang, theme);
  const cached = lineCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const isLoaded = await ensureLanguage(lang);
  if (!isLoaded) {
    return new Map();
  }

  const highlighter = await getHighlighter();
  const fileLines = splitFileLines(content);
  const source = fileLines.join("\n");
  const { tokens } = highlighter.codeToTokens(source, { lang, theme });

  const lineTokens: SyntaxLineTokens = new Map();

  for (const [index, line] of tokens.entries()) {
    lineTokens.set(
      index + 1,
      line.map((token) => ({
        content: token.content,
        color: token.color,
        fontStyle: token.fontStyle,
      })),
    );
  }

  lineCache.set(cacheKey, lineTokens);
  trimCache(lineCache, 24);

  return lineTokens;
};

const highlightCodeBlockTokensInternal = async (
  content: string,
  lang: BundledLanguage,
  theme: SyntaxTheme,
): Promise<SyntaxToken[][]> => {
  const isLoaded = await ensureLanguage(lang);
  if (!isLoaded) {
    return [];
  }

  const highlighter = await getHighlighter();
  const { tokens } = highlighter.codeToTokens(content, { lang, theme });

  return tokens.map((line) =>
    line.map((token) => ({
      content: token.content,
      color: token.color,
      fontStyle: token.fontStyle,
    })),
  );
};

export const highlightCodeBlockTokens = async (
  content: string,
  lang: BundledLanguage,
  theme: SyntaxTheme,
): Promise<SyntaxToken[][]> =>
  scheduleHighlight(() =>
    highlightCodeBlockTokensInternal(content, lang, theme),
  );

export const highlightLineText = async (
  text: string,
  lang: BundledLanguage,
  theme: SyntaxTheme,
): Promise<SyntaxToken[]> => {
  const lines = await highlightCodeBlockTokens(text, lang, theme);
  return lines[0] ?? [{ content: text || " " }];
};

export const highlightParsedDiffLines = async (
  parsed: ParsedFileDiff,
  lang: BundledLanguage,
  theme: SyntaxTheme,
): Promise<Map<string, SyntaxToken[]>> =>
  scheduleHighlight(async () => {
    const cacheKey = buildParsedDiffCacheKey(parsed, lang, theme);
    const cached = parsedDiffCache.get(cacheKey);
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
      const tokenLines = await highlightCodeBlockTokensInternal(text, lang, theme);

      for (const [index, line] of lines.entries()) {
        const key =
          line.type === "delete"
            ? `old:${line.oldLine ?? index}`
            : `new:${line.newLine ?? line.oldLine ?? index}`;

        result.set(key, tokenLines[index] ?? [{ content: line.text || " " }]);
      }
    }

    parsedDiffCache.set(cacheKey, result);
    trimCache(parsedDiffCache, 48);

    return result;
  });

export const preloadSyntaxHighlighter = () => {
  void getHighlighter();
};
