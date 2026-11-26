import { withPropsViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { GitlabCommentEditor } from '@/shared/ui/gitlab-comment-editor';
import { DiffCommentFormVM } from '../../../model/discussion-rows';

export const DiffCommentFormRow = withPropsViewModel(
  DiffCommentFormVM,
  ({ model }) => {
    const {
      markdownScope,
      errorMessage,
      isSubmitting,
      rangeLabel,
      onCancel,
      onSubmit,
    } = model.payload;

    const { body, setBody, textareaRef } = model;
    return (
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <div className="border-slate-200 border-t bg-info-surface px-3.5 py-3 dark:border-[var(--color-border-default)]">
          {rangeLabel && (
            <div className="mb-2 font-semibold text-blue-700 text-xs dark:text-blue-300">
              {t('diff.lineComment')} {rangeLabel}
            </div>
          )}
          <GitlabCommentEditor
            inputRef={textareaRef}
            projectId={markdownScope?.projectId ?? null}
            editorClassName="border-info-border"
            placeholder={t('diff.writeAComment')}
            value={body}
            onChange={setBody}
            rows={3}
            disabled={isSubmitting}
          />

          {errorMessage && (
            <div className="mt-2 text-[13px] text-red-700 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="mt-2.5 flex gap-2">
            <button
              className="cursor-pointer rounded-lg border border-brand bg-brand px-3.5 py-2 font-semibold text-[13px] text-brand-on enabled:hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={isSubmitting || !body.trim()}
              onClick={() => onSubmit(body)}
            >
              {isSubmitting ? t('review.posting') : t('diff.comment')}
            </button>
            <button
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 font-semibold text-[13px] text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-gray-900 dark:text-slate-200 dark:enabled:hover:bg-slate-800"
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  },
);
