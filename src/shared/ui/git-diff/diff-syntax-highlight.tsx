import {
  createContext,
  memo,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { GitLabMergeRequestChange } from "@/shared/api/gitlab";
import { getLanguageFromPath } from "@/shared/lib/syntax-highlight/language-from-path";
import {
  highlightParsedDiffLines,
  type SyntaxToken,
} from "@/shared/lib/syntax-highlight/shiki-highlighter";
import { useSyntaxTheme } from "@/shared/lib/syntax-highlight/use-syntax-theme";
import type { ParsedFileDiff } from "@/shared/lib/parse-unified-diff";

interface DiffSyntaxHighlightContextValue {
  getLineTokens: (line: {
    type: string;
    text: string;
    oldLine: number | null;
    newLine: number | null;
  }) => SyntaxToken[] | null;
}

const DiffSyntaxHighlightContext =
  createContext<DiffSyntaxHighlightContextValue | null>(null);

export const DiffSyntaxHighlightProvider = memo(
  ({
    change,
    parsed,
    children,
  }: {
    change: GitLabMergeRequestChange;
    parsed: ParsedFileDiff | null;
    children: ReactNode;
  }) => {
    const theme = useSyntaxTheme();
    const rootRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [lineTokens, setLineTokens] = useState<Map<string, SyntaxToken[]>>(
      new Map(),
    );

    const language = useMemo(
      () =>
        getLanguageFromPath(change.newPath) ??
        getLanguageFromPath(change.oldPath),
      [change.newPath, change.oldPath],
    );

    useEffect(() => {
      const element = rootRef.current;
      if (!element) {
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        {
          root: null,
          rootMargin: "240px 0px",
          threshold: 0,
        },
      );

      observer.observe(element);

      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (!parsed || !language || !isVisible) {
        return;
      }

      let cancelled = false;

      const highlight = async () => {
        const tokens = await highlightParsedDiffLines(parsed, language, theme);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setLineTokens(tokens);
        });
      };

      void highlight();

      return () => {
        cancelled = true;
      };
    }, [isVisible, language, parsed, theme]);

    const value = useMemo<DiffSyntaxHighlightContextValue>(
      () => ({
        getLineTokens: (line) => {
          if (line.type === "no-newline") {
            return null;
          }

          if (line.type === "delete") {
            return lineTokens.get(`old:${line.oldLine ?? line.text}`) ?? null;
          }

          const lineNumber = line.newLine ?? line.oldLine;
          return lineTokens.get(`new:${lineNumber ?? line.text}`) ?? null;
        },
      }),
      [lineTokens],
    );

    return (
      <DiffSyntaxHighlightContext.Provider value={value}>
        <div ref={rootRef} className="contents">
          {children}
        </div>
      </DiffSyntaxHighlightContext.Provider>
    );
  },
);

export const useDiffSyntaxHighlight = () =>
  useContext(DiffSyntaxHighlightContext);
