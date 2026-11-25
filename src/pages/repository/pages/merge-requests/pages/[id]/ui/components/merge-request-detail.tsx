import { withViewModel } from 'mobx-view-model-react';
import { cn } from '@/shared/lib/cn';
import { GitDiff } from '@/shared/ui/git-diff';
import { DiffSearchProvider } from '@/shared/ui/git-diff/components/diff-search';
import { GitLabMarkdown } from '@/shared/ui/gitlab-markdown/gitlab-markdown';
import { StatusMessage } from '@/shared/ui/status-message';
import { PipelineCard } from '@/widgets/pipeline-card';
import { MergeRequestDetailVM } from '../../model/merge-request-detail';
import { ChangesActiveFileLink } from './changes-active-file-link';
import { ChangesFileTree } from './changes-file-tree';
import { ChangesTreeLayout } from './changes-tree-layout';
import { DiffVersionPicker } from './diff-version-picker';
import { MergeRequestCommentForm } from './merge-request-comment-form';
import { MergeRequestDiscussions } from './merge-request-discussions';
import { MergeRequestOverview } from './merge-request-overview';
import { MrReviewActions } from './mr-review-actions';

export const MergeRequestDetail = withViewModel(
  MergeRequestDetailVM,
  ({ model }) => {
    const page = model.parentViewModel;
    const info = page.mrInfo;
    const detail = info.detailView;
    if (!detail) return null;
    const {
      mergeRequest,
      changes,
      changesError,
      diffRevision,
      diffVersions,
      isPreparingDiffs,
      selectedDiffVersionId,
      headRef,
      baseRef,
      discussions,
      approvals,
    } = detail;
    const {
      markdownScope,
      activityDiscussions,
      activityExpanded,
      descriptionExpanded,
      activityButton,
      changesHeading,
    } = model;
    const { activeFile, selectActiveFile, jumpToFile } = model.fileNavigation;
    const description = mergeRequest.description ?? '';
    const showChangesTree = changes.length > 0;
    const overview = (
      <div className="flex min-w-0 flex-col gap-3">
        {info.resolveDiscussionError && (
          <StatusMessage error>{info.resolveDiscussionError}</StatusMessage>
        )}
        <MergeRequestOverview
          mergeRequest={mergeRequest}
          jira={page.jiraSummary}
          projectPath={markdownScope.projectPath}
          loadedFiles={changes.length}
          onShowFiles={model.showFiles}
          onShowComments={model.showComments}
        >
          {detail.mergeRequest.head_pipeline && markdownScope.projectId > 0 ? (
            <PipelineCard
              payload={{
                projectId: markdownScope.projectId,
                pipelineId: detail.mergeRequest.head_pipeline.id,
                permissions: page.project?.permissions,
              }}
            />
          ) : null}
        </MergeRequestOverview>
        <MrReviewActions
          mergeRequest={mergeRequest}
          approvals={approvals}
          reviewActionInProgress={info.reviewActionInProgress}
          reviewActionError={info.reviewActionError}
          onApprove={info.approve}
          onUnapprove={info.unapprove}
          onRequestChanges={info.requestChanges}
          onCancelRequestChanges={info.cancelRequestChanges}
        />
      </div>
    );

    const mainContent = (
      <div className="flex min-w-0 flex-col gap-5">
        {description.trim() && (
          <section className="flex flex-col gap-3">
            <button
              type="button"
              className="m-0 flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left font-semibold text-lg"
              onClick={model.toggleDescription}
              aria-expanded={descriptionExpanded}
            >
              <svg
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform',
                  descriptionExpanded && 'rotate-90',
                )}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M6 4l8 6-8 6V4z" />
              </svg>
              Описание
            </button>
            {descriptionExpanded && (
              <div className="glass-panel rounded-2xl p-4">
                <GitLabMarkdown {...markdownScope} text={description} />
              </div>
            )}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <button
            type="button"
            className="m-0 flex cursor-pointer scroll-mt-16 items-center gap-2 border-none bg-transparent p-0 text-left font-semibold text-lg"
            ref={activityButton}
            onClick={model.toggleActivity}
            aria-expanded={activityExpanded}
          >
            <svg
              className={cn(
                'h-4 w-4 shrink-0 transition-transform',
                activityExpanded && 'rotate-90',
              )}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M6 4l8 6-8 6V4z" />
            </svg>
            Активность
            {activityDiscussions.length > 0 && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 font-bold text-slate-600 text-xs dark:bg-slate-700 dark:text-slate-300">
                {activityDiscussions.length}
              </span>
            )}
          </button>
          {activityExpanded && (
            <MergeRequestDiscussions
              markdownScope={markdownScope}
              discussions={activityDiscussions}
              onResolveDiscussion={info.resolveDiscussion}
              resolvingDiscussionId={info.resolvingDiscussionId}
              {...model.noteActions}
            />
          )}
        </section>

        <MergeRequestCommentForm
          projectId={markdownScope.projectId}
          canComment={detail.mergeRequest.state === 'opened'}
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
            Изменения
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
                  К последней версии
                </button>
              )
            )}
          </h3>
          {changesError && <StatusMessage error>{changesError}</StatusMessage>}
          {isPreparingDiffs ? (
            <div
              className="flex items-center gap-2 py-4 text-fg-muted text-sm"
              role="status"
            >
              <span
                className="size-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand dark:border-slate-700"
                aria-hidden="true"
              />
              Подготавливаем diff...
            </div>
          ) : (
            (changes.length > 0 || !changesError) && (
              <GitDiff
                key={diffRevision}
                markdownScope={markdownScope}
                changes={changes}
                discussions={discussions}
                canComment={detail.canCommentOnDiff}
                isSubmittingComment={info.isSubmittingDiffComment}
                submitCommentError={info.submitDiffCommentError}
                onAddComment={info.submitDiffComment}
                onClearSubmitError={info.clearSubmitDiffCommentError}
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
            overview={overview}
            tree={
              showChangesTree ? (
                <ChangesFileTree
                  changes={changes}
                  discussions={discussions}
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
