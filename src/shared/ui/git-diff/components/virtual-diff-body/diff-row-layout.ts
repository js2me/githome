import type { VirtualDiffRow } from '@/shared/lib/diff/build-diff-virtual-rows';

const isDiffCodeRow = (row: VirtualDiffRow) =>
  row.type === 'line' || row.type === 'hunk' || row.type === 'expand';

export const getDiffRowLayoutClassName = (row: VirtualDiffRow) =>
  isDiffCodeRow(row) ? 'git-diff-code-row w-full' : 'w-full min-w-full';
