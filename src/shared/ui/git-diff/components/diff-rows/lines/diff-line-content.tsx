import { memo } from 'react';
import type { WordDiffSegment } from '@/shared/lib/diff/compute-word-diff';
import type { DiffDisplayLine } from '@/shared/lib/diff/parse-unified-diff';
import { useRowSearchHighlight } from '../../diff-search';
import { useDiffSyntaxHighlight } from '../../diff-syntax-highlight';
import { HighlightedCode } from '../../highlighted-code';

export const DiffLineContent = memo(
  ({
    line,
    wordDiffSegments,
    rowId,
  }: {
    line: DiffDisplayLine;
    wordDiffSegments: WordDiffSegment[] | null;
    rowId?: string;
  }) => {
    const syntax = useDiffSyntaxHighlight();
    const searchHighlight = useRowSearchHighlight(rowId);
    return (
      <HighlightedCode
        text={line.text}
        tokens={syntax?.getLineTokens(line)}
        wordDiffSegments={wordDiffSegments}
        searchHighlight={searchHighlight}
      />
    );
  },
);
