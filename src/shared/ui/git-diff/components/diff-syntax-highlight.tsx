import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { observer } from "mobx-react-lite";
import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import { DiffSyntaxHighlight } from "@/shared/lib/syntax-highlight/diff-syntax-highlight";
import type { SyntaxToken } from "@/shared/lib/syntax-highlight/syntax-highlighter";
import type { Globals } from "@/globals";
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

export const DiffSyntaxHighlightProvider = observer(
  ({
    globals,
    change,
    parsed,
    children,
  }: {
    globals: Globals;
    change: GitLabMergeRequestChangeDC;
    parsed: ParsedFileDiff | null;
    children: ReactNode;
  }) => {
    const theme = globals.stores.theme.syntaxTheme;
    const rootRef = useRef<HTMLDivElement>(null);
    const [version, rerender] = useReducer((v) => v + 1, 0);

    const model = useMemo(
      () => new DiffSyntaxHighlight(change.new_path, change.old_path),
      [change.new_path, change.old_path],
    );

    useEffect(() => () => model.dispose(), [model]);

    useEffect(
      () =>
        model.subscribe(() => {
          startTransition(() => {
            rerender();
          });
        }),
      [model],
    );

    useEffect(() => {
      const element = rootRef.current;
      if (!element) {
        return;
      }

      return model.attachRoot(element);
    }, [model]);

    useEffect(() => {
      model.setContent(parsed, theme);
    }, [model, parsed, theme]);

    const value = useMemo<DiffSyntaxHighlightContextValue>(
      () => ({
        getLineTokens: (line) => model.getLineTokens(line),
      }),
      [model, version],
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
