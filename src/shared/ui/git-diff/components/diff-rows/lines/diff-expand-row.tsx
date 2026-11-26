import { ArrowDownToLine, ArrowUpToLine } from '@gravity-ui/icons';
import { memo } from 'react';
import { cn } from '@/shared/lib/cn';
import type {
  DiffExpandGap,
  DiffExpandMode,
  DiffExpandState,
} from '@/shared/lib/diff/expand-diff-context';
import {
  getChunkExpandTooltip,
  getExpandBarLabel,
} from '@/shared/lib/diff/expand-diff-context';
import { diffGridClassName } from '../grid-class';
import { ExpandIconButton } from './expand-icon-button';

export const DiffExpandRow = memo(
  ({
    gap,
    expandState,
    isLoading,
    onExpand,
    hunkHeader,
  }: {
    gap: DiffExpandGap;
    expandState: DiffExpandState;
    isLoading: boolean;
    onExpand: (gap: DiffExpandGap, mode: DiffExpandMode) => void;
    hunkHeader?: string;
  }) => {
    const isBetweenGap = gap.id.startsWith('between:');
    const showUp = gap.direction === 'up' || isBetweenGap;
    const showDown = gap.direction === 'down' || isBetweenGap;

    return (
      <div
        className={cn(
          diffGridClassName,
          'git-diff-expand-row',
          hunkHeader && 'git-diff-expand-row--collapsed-hunk',
        )}
      >
        <div className="git-diff-expand-gutter">
          {showDown && (
            <ExpandIconButton
              title={getChunkExpandTooltip('down', expandState, gap)}
              isLoading={isLoading}
              onClick={() => onExpand(gap, 'chunk-down')}
            >
              <ArrowDownToLine />
            </ExpandIconButton>
          )}
          {showUp && (
            <ExpandIconButton
              title={getChunkExpandTooltip('up', expandState, gap)}
              isLoading={isLoading}
              onClick={() => onExpand(gap, 'chunk-up')}
            >
              <ArrowUpToLine />
            </ExpandIconButton>
          )}
        </div>
        {hunkHeader ? (
          <div className="git-diff-expand-hunk">{hunkHeader}</div>
        ) : (
          <div className="git-diff-expand-label">
            {getExpandBarLabel(gap, expandState)}
          </div>
        )}
      </div>
    );
  },
);
