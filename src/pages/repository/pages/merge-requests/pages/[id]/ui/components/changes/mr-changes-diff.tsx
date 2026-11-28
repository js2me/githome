import { observer } from 'mobx-react-lite';
import type { GitLabDiscussionDC } from '@/shared/api/gitlab';
import { t } from '@/shared/lib/i18n';
import { GitDiff } from '@/shared/ui/git-diff';
import { StatusMessage } from '@/shared/ui/status-message';
import type { MergeRequestDetailVM } from '../../../model/merge-request-detail';
import { DiffVersionPicker } from './diff-version-picker';
import { ReviewFileButton } from './review-file-button';

const emptyDiscussions: GitLabDiscussionDC[] = [];

export const MrChangesDiff = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const { parentViewModel: page } = model;
    const info = page.mrInfo;
    const review = info.reviewedFiles;
    const detail = info.detailView;
    const changes = detail?.changes;
    const { activeFile, selectActiveFile } = model.fileNavigation;

    if (!detail || !changes) return null;
    const {
      mergeRequest,
      changesError,
      diffRevision,
      diffVersions,
      isPreparingDiffs,
      selectedDiffVersionId,
      headRef,
      baseRef,
      discussions,
    } = detail;
    const repository = page.parentViewModel;
    const projectLoadError = !page.project && repository.errorMessage;
    const { markdownScope } = model;

    return (
      <>
        {diffVersions.length > 1 && (
          <div className="mr-editor-versions">
            <DiffVersionPicker
              versions={diffVersions}
              selectedVersionId={selectedDiffVersionId}
              onSelectVersion={info.selectDiffVersion}
            />
          </div>
        )}
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
        {isPreparingDiffs || (!page.project && repository.isLoading) ? (
          <StatusMessage>{t('review.preparingDiff')}</StatusMessage>
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
      </>
    );
  },
);
