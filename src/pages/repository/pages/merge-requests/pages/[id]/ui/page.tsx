import { withViewModel } from "mobx-view-model-react";
import { GitLabMarkdownProvider } from "@/shared/ui/gitlab-markdown/gitlab-markdown";
import { StatusMessage } from "@/shared/ui/status-message";
import { MergeRequestPageVM } from "../model";
import { MergeRequestDetail } from "./components/merge-request-detail";

export const MergeRequestPage = withViewModel(MergeRequestPageVM, ({ model }) => {
  const { mrInfo } = model;
  const detailView = mrInfo.detailView;
  const connection = model.globals.stores.settings.activeConnection;
  const projectPath = model.project?.path_with_namespace ?? "";

  return (
    <GitLabMarkdownProvider connection={connection} projectPath={projectPath}>
      <section>
        {mrInfo.isLoading && (
          <StatusMessage>Загружаем merge request...</StatusMessage>
        )}

        {mrInfo.showLoadError && (
          <StatusMessage error>{mrInfo.errorMessage}</StatusMessage>
        )}

        {detailView && (
            <MergeRequestDetail
              mergeRequest={detailView.mergeRequest}
              changes={detailView.changes}
              discussions={detailView.discussions}
              approvals={detailView.approvals}
              canComment={detailView.mergeRequest.diff_refs != null}
              isSubmittingComment={mrInfo.isSubmittingDiffComment}
              submitCommentError={mrInfo.submitDiffCommentError}
              onAddComment={mrInfo.submitDiffComment}
              onClearSubmitError={mrInfo.clearSubmitDiffCommentError}
              loadFileContent={mrInfo.loadDiffFileContent}
              onResolveDiscussion={mrInfo.resolveDiscussion}
              resolvingDiscussionId={mrInfo.resolvingDiscussionId}
              resolveDiscussionError={mrInfo.resolveDiscussionError}
              reviewActionInProgress={mrInfo.reviewActionInProgress}
              reviewActionError={mrInfo.reviewActionError}
              onApprove={mrInfo.approve}
              onUnapprove={mrInfo.unapprove}
              onRequestChanges={mrInfo.requestChanges}
              onCancelRequestChanges={mrInfo.cancelRequestChanges}
            />
          )}
      </section>
    </GitLabMarkdownProvider>
  );
});
