import { memo, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import type { RowSearchHighlightState } from '../../model/search-highlights';

interface SearchHighlightedTextProps extends RowSearchHighlightState {
  text: string;
}

export const renderSearchHighlightedText = (
  { text, ranges, activeRange }: SearchHighlightedTextProps,
  renderPlain: (start: number, end: number) => ReactNode = (start, end) =>
    text.slice(start, end),
) => {
  if (ranges.length === 0) {
    return <>{text.length ? renderPlain(0, text.length) : ' '}</>;
  }
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      nodes.push(renderPlain(cursor, range.start));
    }

    const isActive =
      activeRange?.start === range.start && activeRange.end === range.end;
    nodes.push(
      <mark
        key={range.start}
        className={cn(
          'git-diff-search-mark',
          isActive
            ? 'git-diff-search-mark--active'
            : 'git-diff-search-mark--inactive',
        )}
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );

    cursor = range.end;
  }

  if (cursor < text.length) {
    nodes.push(renderPlain(cursor, text.length));
  }

  return <>{nodes.length ? nodes : ' '}</>;
};

export const SearchHighlightedText = memo((props: SearchHighlightedTextProps) =>
  renderSearchHighlightedText(props),
);
