import { observer } from 'mobx-react-lite';
import type { FileGitDiff } from '../../model/file-git-diff';
import { getDiffRowLayoutClassName } from './diff-row-layout';
import { VirtualDiffRowView } from './virtual-diff-row-view';
import { VirtualizedDiffBody } from './virtualized-diff-body';

export const DiffBody = observer(
  ({ fileGitDiff: file }: { fileGitDiff: FileGitDiff }) => {
    const { rows, navigation } = file;
    if (rows.virtualized) return <VirtualizedDiffBody file={file} />;
    return (
      <div ref={navigation.bodyRef} className="w-full pl-7">
        {rows.virtualRows.map((row) => (
          <div
            key={row.id}
            className={getDiffRowLayoutClassName(row)}
            data-diff-row-id={row.id}
          >
            <VirtualDiffRowView row={row} file={file} />
          </div>
        ))}
      </div>
    );
  },
);
