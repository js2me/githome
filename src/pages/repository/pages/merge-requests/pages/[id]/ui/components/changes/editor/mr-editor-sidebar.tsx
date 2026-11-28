import { CodeCommits, Files } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import {
  CHANGES_FILE_TREE_MIN_WIDTH,
  getMaxChangesFileTreeWidthForViewport,
} from '@/shared/lib/file-tree/changes-file-tree-width';
import { t } from '@/shared/lib/i18n';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';
import { MrCommitList } from '../../overview/workspace/mr-commit-list';
import { AutoReviewToggle } from '../auto-review-toggle';
import { ChangesFileTree } from '../changes-file-tree';

export const MrEditorSidebar = observer(
  ({
    model,
    overview = false,
  }: {
    model: MergeRequestDetailVM;
    overview?: boolean;
  }) => {
    const {
      commits: commitLog,
      parentViewModel,
      mobileFilesOpen: mobileOpen,
      showEditorCommits: showCommits,
    } = model;
    const detail = parentViewModel.mrInfo.detailView;
    if (!detail) return null;
    const commitsVisible = !overview && showCommits;
    const autoReviewToggle = detail.changes.length > 0 && !commitsVisible && (
      <AutoReviewToggle
        checked={model.autoReviewFiles}
        onToggle={model.toggleAutoReviewFiles}
      />
    );

    const count =
      commitLog.query.data?.pages[0]?.total ?? commitLog.items.length;
    return (
      <aside className="mr-editor-sidebar" aria-label={t('common.files')}>
        <button
          type="button"
          className="mr-mobile-files"
          aria-expanded={mobileOpen}
          onClick={model.toggleMobileFiles}
        >
          <Files className="size-4" aria-hidden />
          {t('common.files')}
          <span className="text-fg-muted">{detail.changes.length}</span>
        </button>
        <div
          className="mr-editor-sidebar-inner"
          data-mobile-open={mobileOpen}
          data-overview={overview}
        >
          {!overview && (
            <div className="mr-editor-sidebar-controls">
              <div
                className="mr-editor-segments mr-segments"
                role="group"
                aria-label={t('review.mergeRequestSections')}
              >
                <button
                  type="button"
                  aria-pressed={!commitsVisible}
                  onClick={model.showFilesTab}
                >
                  <Files className="size-4 shrink-0" aria-hidden />
                  {t('common.files')}{' '}
                  <span className="text-fg-muted">{detail.changes.length}</span>
                </button>
                <button
                  type="button"
                  aria-pressed={commitsVisible}
                  onClick={model.showCommitsTab}
                >
                  <CodeCommits className="size-4 shrink-0" aria-hidden />
                  {t('workbench.commits')}{' '}
                  {count > 0 && <span className="text-fg-muted">{count}</span>}
                </button>
              </div>
              {autoReviewToggle}
            </div>
          )}
          {commitsVisible ? (
            <MrCommitList
              model={commitLog}
              onSelect={model.selectEditorCommit}
            />
          ) : (
            <ChangesFileTree
              changes={detail.changes}
              discussions={detail.discussions ?? []}
              activeFile={model.fileNavigation.activeFile}
              onSelectFile={model.selectEditorFile}
              headerAction={overview ? autoReviewToggle : undefined}
            />
          )}
        </div>
        {!overview && (
          <div
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
            aria-valuemin={CHANGES_FILE_TREE_MIN_WIDTH}
            aria-valuemax={getMaxChangesFileTreeWidthForViewport()}
            aria-valuenow={model.width}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
                return;
              event.preventDefault();
              model.resize(
                model.width + (event.key === 'ArrowLeft' ? -12 : 12),
              );
            }}
            aria-label={t('review.resizeFileTree')}
            className="mr-editor-resize"
            onPointerDown={model.handleResizePointerDown}
          />
        )}
      </aside>
    );
  },
);
