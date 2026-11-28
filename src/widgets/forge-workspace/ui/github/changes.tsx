import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import { ChangesFileTree } from '@/shared/ui/changes-file-tree';
import { GitDiff } from '@/shared/ui/git-diff';
import { DiffSearchProvider } from '@/shared/ui/git-diff/components/diff-search';
import type { GithubReviewModel } from '../../model/github/review';
import { ForgeLoadMore } from '../load-more';
import { ForgeQueryStatus } from '../query-status';
import { GithubReviewActions } from './review-actions';
import { GithubViewedButton } from './viewed-button';

export const GithubChanges = observer(
  ({
    model,
    includeReview = true,
  }: {
    model: GithubReviewModel;
    includeReview?: boolean;
  }) => {
    const { changes, files, inline, revision, state, fileNavigation } = model;
    const hasViewedState = Boolean(state.viewedFiles.data);
    const total = model.parent.pullRequest.data?.changedFiles ?? 0;
    if (!revision) return <p role="alert">{t('diff.couldNotLoadDiff2')}</p>;

    return (
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div className="min-w-0 self-start lg:sticky lg:top-4">
          <ChangesFileTree
            changes={files}
            discussions={model.discussions}
            activeFile={fileNavigation.activeFile}
            onSelectFile={fileNavigation.jumpToFile}
          />
          <ForgeLoadMore query={changes} />
        </div>
        <div className="grid min-w-0 gap-4">
          <ForgeQueryStatus query={changes} />
          <ForgeQueryStatus query={inline} />
          {state.error && <p role="alert">{state.error}</p>}
          {(state.viewedFiles.error || state.threads.error) && (
            <p role="status" className="text-fg-muted text-sm">
              {t('forge.reviewStateUnavailable')}
            </p>
          )}
          {total > 3000 && <p role="status">{t('forge.fileLimit')}</p>}
          {changes.data && (
            <DiffSearchProvider>
              <GitDiff
                key={JSON.stringify([
                  model.parent.repository,
                  model.parent.number,
                  revision.head,
                  revision.base,
                ])}
                changes={files}
                discussions={model.discussions}
                canComment={model.canComment}
                isSubmittingComment={model.pending !== null}
                submitCommentError={model.inlineError}
                onAddComment={model.addComment}
                onClearSubmitError={model.clearInlineError}
                isFileReviewed={
                  hasViewedState
                    ? (file) => state.viewed.has(file.new_path)
                    : undefined
                }
                renderFileAction={
                  hasViewedState
                    ? (file, onChange) => (
                        <GithubViewedButton
                          model={state}
                          path={file.new_path}
                          onChange={onChange}
                        />
                      )
                    : undefined
                }
                onResolveThread={state.resolve}
                resolvingDiscussionId={state.savingThread}
                activeFile={fileNavigation.activeFile}
                onActiveFileChange={fileNavigation.selectActiveFile}
                onReplyThread={model.reply}
                replyingDiscussionId={
                  typeof model.pending === 'object'
                    ? model.pending?.replyTo
                    : null
                }
                replyErrorDiscussionId={model.replyError?.id}
                replyError={model.replyError?.message}
                onClearReplyError={model.clearReplyError}
                headRef="head"
                baseRef="base"
                headBranch={model.parent.pullRequest.data?.sourceBranch}
                mergeRequestIid={model.parent.number ?? undefined}
                loadFileContent={model.loadFileContent}
                loadFileImage={model.loadFileImage}
              />
            </DiffSearchProvider>
          )}
          {includeReview && <GithubReviewActions model={model} />}
        </div>
      </div>
    );
  },
);
