import { memo } from 'react';
import { diffGridClassName } from '../grid-class';

export const DiffHunkRow = memo(({ header }: { header: string }) => (
  <div className={diffGridClassName}>
    <div className="git-diff-hunk">{header}</div>
  </div>
));
