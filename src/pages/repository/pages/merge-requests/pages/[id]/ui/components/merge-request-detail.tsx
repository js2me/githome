import { withViewModel } from 'mobx-view-model-react';
import type { GitLabDiscussionDC } from '@/shared/api/gitlab';
import { t } from '@/shared/lib/i18n';
import { GitDiff } from '@/shared/ui/git-diff';
import { DiffSearchProvider } from '@/shared/ui/git-diff/components/diff-search';
import { StatusMessage } from '@/shared/ui/status-message';
import { MergeRequestDetailVM } from '../../model/merge-request-detail';
import { ChangesActiveFileLink } from './changes/changes-active-file-link';
import { ChangesFileTree } from './changes/changes-file-tree';
import { ChangesTreeLayout } from './changes/changes-tree-layout';
import { DiffVersionPicker } from './changes/diff-version-picker';
import { ReviewFileButton } from './changes/review-file-button';
import { MergeRequestActivity } from './discussions/merge-request-activity';
import { MergeRequestCommentForm } from './discussions/merge-request-comment-form';
import { MergeRequestDescription } from './overview/header/merge-request-description';
import { MergeRequestHeader } from './overview/header/merge-request-header';

const emptyDiscussions: GitLabDiscussionDC[] = [];

export const MergeRequestDetail = withViewModel(
  MergeRequestDetailVM,
  ({ model }) => {
    const page = model.parentViewModel;
    const info = page.mrInfo;
    const review = info.reviewedFiles;
    const detail = info.detailView;
    if (!detail) return null;
    const {
      mergeRequest,
      changes,
      changesError,
      diffRevision,
      diffVersions,
      isPreparingDiffs: isDiffLoading,
      selectedDiffVersionId,
      headRef,
      baseRef,
      discussions,
    } = detail;
    const { markdownScope, changesHeading } = model;
    const { activeFile, selectActiveFile, jumpToFile } = model.fileNavigation;
    const repository = page.parentViewModel;
    const isPreparingDiffs =
      isDiffLoading || (!page.project && repository.isLoading);
    const projectLoadError = !page.project && repository.errorMessage;
    const showChangesTree = changes.length > 0;
    const mainContent = (
      <div className="flex min-w-0 flex-col gap-5">
        <MergeRequestDescription
          model={model}
          description={mergeRequest.description ?? ''}
        />
        <MergeRequestActivity model={model} />

        <MergeRequestCommentForm
          projectId={markdownScope.projectId}
          canComment={
            Boolean(page.project) && detail.mergeRequest.state === 'opened'
          }
          isSubmitting={info.isSubmittingMrComment}
          submitError={info.submitMrCommentError}
          onSubmit={info.submitMrComment}
          onClearSubmitError={info.clearSubmitMrCommentError}
        />

        <section className="flex flex-col gap-3">
          <h3
            ref={changesHeading}
            tabIndex={-1}
            className="m-0 flex scroll-mt-16 items-center gap-2 font-semibold text-lg"
          >
            {t('review.changes')}
            {changes.length > 0 && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 font-bold text-slate-600 text-xs dark:bg-slate-700 dark:text-slate-300">
                {changes.length}
              </span>
            )}
            {diffVersions.length > 1 ? (
              <DiffVersionPicker
                versions={diffVersions}
                selectedVersionId={selectedDiffVersionId}
                onSelectVersion={info.selectDiffVersion}
              />
            ) : (
              selectedDiffVersionId !== null && (
                <button
                  className="glass-control rounded-md px-2 py-0.5 font-medium text-xs"
                  type="button"
                  onClick={() => info.selectDiffVersion(null)}
                >
                  {t('review.goToLatestVersion')}
                </button>
              )
            )}
          </h3>
          {(changesError || projectLoadError) && (
            <StatusMessage error>
              {changesError || projectLoadError}
            </StatusMessage>
          )}
          {review.error && (
            <StatusMessage error>
              {review.error.path} {t('review.couldNotSaveViewedStatus')}{' '}
              {review.error.message}
            </StatusMessage>
          )}
          {isPreparingDiffs ? (
            <div
              className="flex items-center gap-2 py-4 text-fg-muted text-sm"
              role="status"
            >
              <span
                className="size-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand dark:border-slate-700"
                aria-hidden="true"
              />
              {t('review.preparingDiff')}
            </div>
          ) : (
            (changes.length > 0 || (!changesError && !projectLoadError)) && (
              <GitDiff
                key={diffRevision}
                markdownScope={markdownScope}
                changes={changes}
                discussions={discussions ?? emptyDiscussions}
                canComment={detail.canCommentOnDiff}
                isSubmittingComment={info.isSubmittingDiffComment}
                submitCommentError={info.submitDiffCommentError}
                onAddComment={info.submitDiffComment}
                onClearSubmitError={info.clearSubmitDiffCommentError}
                renderFileAction={(change, onReviewedChange) => (
                  <ReviewFileButton
                    review={review}
                    change={change}
                    onReviewedChange={onReviewedChange}
                    head={headRef ?? ''}
                    base={baseRef ?? null}
                  />
                )}
                mergeRequestIid={mergeRequest.iid}
                headBranch={mergeRequest.source_branch ?? null}
                headRef={headRef ?? null}
                baseRef={baseRef ?? null}
                loadFileContent={info.loadDiffFileContent}
                loadFileImage={info.gitDiff.loadFileImage}
                onResolveThread={info.resolveDiscussion}
                resolvingDiscussionId={info.resolvingDiscussionId}
                onReplyThread={info.replyToDiscussion}
                replyingDiscussionId={info.replyingDiscussionId || null}
                replyErrorDiscussionId={info.replyDiscussionErrorKey || null}
                replyError={info.replyDiscussionError || null}
                onClearReplyError={info.clearReplyDiscussionError}
                {...model.noteActions}
                activeFile={activeFile}
                onActiveFileChange={selectActiveFile}
              />
            )
          )}
        </section>
      </div>
    );

    return (
      <DiffSearchProvider
        findBarVisibility={showChangesTree ? 'always' : 'toggle'}
      >
        <div className="flex flex-col gap-4">
          <ChangesTreeLayout
            model={model}
            overview={<MergeRequestHeader model={model} />}
            tree={
              showChangesTree ? (
                <ChangesFileTree
                  changes={changes}
                  discussions={discussions ?? emptyDiscussions}
                  activeFile={activeFile}
                  onSelectFile={jumpToFile}
                />
              ) : null
            }
            connector={
              showChangesTree && (
                <ChangesActiveFileLink activeFile={activeFile} />
              )
            }
          >
            {mainContent}
          </ChangesTreeLayout>
        </div>
      </DiffSearchProvider>
    );
  },
);
