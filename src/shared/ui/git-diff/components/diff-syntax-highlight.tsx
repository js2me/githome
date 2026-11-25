import { observer } from 'mobx-react-lite';
import { createContext, type ReactNode, useContext } from 'react';
import type { FileDiffHighlighting } from '../model/file-git-diff/highlighting';

const DiffSyntaxHighlightContext = createContext<
  FileDiffHighlighting['tokens'] | null
>(null);

export const DiffSyntaxHighlightProvider = observer(
  ({
    highlighting,
    children,
  }: {
    highlighting: FileDiffHighlighting;
    children: ReactNode;
  }) => (
    <DiffSyntaxHighlightContext.Provider value={highlighting.tokens}>
      <div ref={highlighting.attach} className="contents">
        {children}
      </div>
    </DiffSyntaxHighlightContext.Provider>
  ),
);

export const useDiffSyntaxHighlight = () =>
  useContext(DiffSyntaxHighlightContext);
