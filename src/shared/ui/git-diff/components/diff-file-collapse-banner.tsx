import { memo } from "react";
import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";

const GENERATED_DOCS_URL =
  "https://docs.gitlab.com/ee/user/project/merge_requests/changes.html#collapse-generated-files";

export const DiffFileCollapseBanner = memo(
  ({
    change,
    isLoading,
    onExpand,
  }: {
    change: GitLabMergeRequestChangeDC;
    isLoading: boolean;
    onExpand: () => void;
  }) => {
    if (change.too_large) {
      return (
        <div className="border-b border-[var(--color-border-default)] bg-orange-50 px-4 py-4 text-sm text-[var(--color-fg-default)] dark:bg-[var(--color-collapse-bg)]">
          <p className="m-0">
            Diff слишком большой для отображения в этом интерфейсе.
          </p>
        </div>
      );
    }

    const message = (
      <>
        Сгенерированные файлы по умолчанию свёрнуты. Чтобы изменить это
        поведение, отредактируйте файл{" "}
        <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[13px] dark:bg-white/10">
          .gitattributes
        </code>
        .{" "}
        <a
          className="text-[var(--color-fg-link)] hover:underline"
          href={GENERATED_DOCS_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          Подробнее
        </a>
        .
      </>
    );

    return (
      <div className="border-b border-[var(--color-border-default)] bg-orange-50 px-4 py-4 text-sm text-[var(--color-fg-default)] dark:bg-[var(--color-collapse-bg)]">
        <p className="m-0">{message}</p>
        <button
          className="mt-3 cursor-pointer rounded-md border border-[var(--color-collapse-btn-border)] bg-[var(--color-collapse-btn-bg)] px-3 py-1.5 text-[13px] font-semibold text-white transition enabled:hover:bg-[var(--color-collapse-btn-bg-hover)] disabled:cursor-wait disabled:opacity-60"
          type="button"
          disabled={isLoading}
          onClick={onExpand}
        >
          {isLoading ? "Загружаем..." : "Развернуть файл"}
        </button>
      </div>
    );
  },
);
