import { useCallback, useState } from "react";
import { GitlabCommentEditor } from "@/shared/ui/gitlab-comment-editor";
import { StatusMessage } from "@/shared/ui/status-message";

export const MergeRequestCommentForm = ({
  projectId,
  canComment,
  isSubmitting,
  submitError,
  onSubmit,
  onClearSubmitError,
}: {
  projectId: number;
  canComment: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (body: string) => Promise<boolean>;
  onClearSubmitError: () => void;
}) => {
  const [body, setBody] = useState("");

  const handleChange = useCallback(
    (value: string) => {
      setBody(value);
      if (submitError) {
        onClearSubmitError();
      }
    },
    [onClearSubmitError, submitError],
  );

  const handleSubmit = useCallback(async () => {
    const success = await onSubmit(body);
    if (success) {
      setBody("");
    }
  }, [body, onSubmit]);

  if (!canComment) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gray-900">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h3 className="m-0 text-sm font-semibold text-slate-800 dark:text-slate-200">
          Комментарий к merge request
        </h3>
      </div>

      <div className="px-4 py-3.5">
        <GitlabCommentEditor
          projectId={projectId}
          className="min-h-[96px]"
          placeholder="Напишите общий комментарий к этому merge request..."
          value={body}
          onChange={handleChange}
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
            className="cursor-pointer rounded-lg border border-brand bg-brand px-3.5 py-2 text-[13px] font-semibold text-white enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isSubmitting || !body.trim()}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {isSubmitting ? "Отправка..." : "Отправить комментарий"}
          </button>
        </div>
      </div>
    </div>
  );
};
