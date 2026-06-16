import { withViewModel } from "mobx-view-model-react";
import { GitLabMarkdownProvider } from "@/shared/ui/gitlab-markdown/gitlab-markdown";
import { StatusMessage } from "@/shared/ui/status-message";
import { MergeRequestVM } from "../model";
import { MergeRequestDetail } from "./components/merge-request-detail";

export const MergeRequestPage = withViewModel(MergeRequestVM, ({ model }) => {
  const { mrInfo } = model;
  const connection = model.globals.stores.settings.activeConnection;
  const projectPath = model.project?.pathWithNamespace ?? "";

  return (
    <GitLabMarkdownProvider connection={connection} projectPath={projectPath}>
      <section>
      {mrInfo.isLoading && (
        <StatusMessage>Загружаем merge request...</StatusMessage>
      )}

      {mrInfo.errorMessage && !mrInfo.isLoading && (
        <StatusMessage error>{mrInfo.errorMessage}</StatusMessage>
      )}

      {!mrInfo.isLoading &&
        !mrInfo.errorMessage &&
        mrInfo.mergeRequestDetail &&
        mrInfo.mergeRequestChanges &&
        mrInfo.mergeRequestDiscussions &&
        mrInfo.mergeRequestApprovals && (
          <MergeRequestDetail
            mergeRequest={mrInfo.mergeRequestDetail}
            changes={mrInfo.mergeRequestChanges.changes}
            discussions={mrInfo.mergeRequestDiscussions.discussions}
            approvals={mrInfo.mergeRequestApprovals}
            canComment={mrInfo.mergeRequestDetail.diffRefs !== null}
            isSubmittingComment={mrInfo.isSubmittingDiffComment}
            submitCommentError={mrInfo.submitDiffCommentError}
            onAddComment={(input) => mrInfo.submitDiffComment(input)}
            onClearSubmitError={() => mrInfo.clearSubmitDiffCommentError()}
            loadFileContent={(filePath, ref) =>
              mrInfo.loadDiffFileContent(filePath, ref)
            }
            onResolveDiscussion={(discussionId, resolved) => {
              void mrInfo.resolveDiscussion(discussionId, resolved);
            }}
            resolvingDiscussionId={mrInfo.resolvingDiscussionId}
            resolveDiscussionError={mrInfo.resolveDiscussionError}
            reviewActionInProgress={mrInfo.reviewActionInProgress}
            reviewActionError={mrInfo.reviewActionError}
            onApprove={() => {
              void mrInfo.approve();
            }}
            onUnapprove={() => {
              void mrInfo.unapprove();
            }}
            onRequestChanges={() => {
              void mrInfo.requestChanges();
            }}
            onCancelRequestChanges={() => {
              void mrInfo.cancelRequestChanges();
            }}
          />
        )}
      </section>
    </GitLabMarkdownProvider>
  );
});
