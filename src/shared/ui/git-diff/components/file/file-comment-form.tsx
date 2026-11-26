import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import { GitlabCommentEditor } from '@/shared/ui/gitlab-comment-editor';
import type { FileGitDiff } from '../../model/file-git-diff';

export const FileCommentForm = observer(
  ({
    model,
    isSubmitting,
    submitError,
  }: {
    model: FileGitDiff;
    isSubmitting: boolean;
    submitError: string | null;
  }) => {
    const { comments, parent } = model;
    const { markdownScope } = parent.payload;
    const { fileCommentBody: body, setFileCommentBody: setBody } = comments;

    return (
      <div className="border-slate-200 border-b bg-info-surface px-3.5 py-3 dark:border-[var(--color-border-default)]">
        <div className="mb-2 font-semibold text-blue-700 text-xs dark:text-blue-300">
          {t('diff.fileComment')}
        </div>
        <GitlabCommentEditor
          projectId={markdownScope?.projectId ?? null}
          editorClassName="border-info-border"
          placeholder={t('diff.writeACommentOnThisFile')}
          value={body}
          onChange={setBody}
          disabled={isSubmitting}
        />
        {submitError && (
          <div
            className="mt-2 text-red-600 text-xs dark:text-red-300"
            role="alert"
          >
            {submitError}
          </div>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 text-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-canvas-default dark:text-slate-300 dark:hover:bg-slate-800"
            type="button"
            disabled={isSubmitting}
            onClick={comments.cancelFileComment}
          >
            {t('common.cancel')}
          </button>
          <button
            className="rounded-md bg-brand px-3 py-1.5 font-semibold text-brand-on text-xs transition enabled:hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={isSubmitting || !body.trim()}
            onClick={() => {
              void comments.submitFileComment(body);
            }}
          >
            {isSubmitting ? t('review.posting') : t('diff.post')}
          </button>
        </div>
      </div>
    );
  },
);
