import { withPropsViewModel } from 'mobx-view-model-react';
import { GitlabCommentEditor } from '@/shared/ui/gitlab-comment-editor';
import { StatusMessage } from '@/shared/ui/status-message';
import { MergeRequestCommentFormVM } from '../../../model/merge-request-comment-form';

export const MergeRequestCommentForm = withPropsViewModel(
  MergeRequestCommentFormVM,
  ({ model }) => {
    const { projectId, canComment, isSubmitting, submitError } = model.payload;
    const { body } = model;
    if (!canComment) {
      return null;
    }

    return (
      <div className="glass-panel overflow-hidden rounded-xl">
        <div className="border-slate-200 border-b px-4 py-3 dark:border-slate-800">
          <h3 className="m-0 font-semibold text-slate-800 text-sm dark:text-slate-200">
            Комментарий к merge request
          </h3>
        </div>

        <div className="px-4 py-3.5">
          <GitlabCommentEditor
            projectId={projectId}
            className="min-h-[96px]"
            placeholder="Напишите общий комментарий к этому merge request..."
            value={body}
            onChange={model.change}
            rows={4}
            disabled={isSubmitting}
          />

          {submitError && (
            <div className="mt-2">
              <StatusMessage error>{submitError}</StatusMessage>
            </div>
          )}

          <div className="mt-3">
            <button
              className="glass-primary rounded-lg px-3.5 py-2 font-semibold text-[13px]"
              type="button"
              disabled={isSubmitting || !body.trim()}
              onClick={() => {
                void model.submit();
              }}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить комментарий'}
            </button>
          </div>
        </div>
      </div>
    );
  },
);
