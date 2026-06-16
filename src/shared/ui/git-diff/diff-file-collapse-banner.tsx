import { memo } from "react";
import type { GitLabMergeRequestChange } from "@/shared/api/gitlab";

const GENERATED_DOCS_URL =
  "https://docs.gitlab.com/ee/user/project/merge_requests/changes.html#collapse-generated-files";

export const DiffFileCollapseBanner = memo(
  ({
    change,
    isLoading,
    onExpand,
  }: {
    change: GitLabMergeRequestChange;
    isLoading: boolean;
    onExpand: () => void;
  }) => {
    if (change.tooLarge) {
      return (
        <div className="border-b border-[#dbdbdb] bg-orange-50 px-4 py-4 text-sm text-[#303030] dark:border-[#30363d] dark:bg-[#2d2218] dark:text-[#e6edf3]">
          <p className="m-0">
            Diff слишком большой для отображения в этом интерфейсе.
          </p>
        </div>
      );
    }

    const message = change.generatedFile ? (
      <>
        Сгенерированные файлы по умолчанию свёрнуты. Чтобы изменить это
        поведение, отредактируйте файл{" "}
        <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[13px] dark:bg-white/10">
          .gitattributes
        </code>
        .{" "}
        <a
          className="text-[#1f75cb] hover:underline dark:text-[#61afef]"
          href={GENERATED_DOCS_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          Подробнее
        </a>
        .
      </>
    ) : (
      <>
        Файлы с большими изменениями по умолчанию свёрнуты, чтобы ускорить
        просмотр.
      </>
    );

    return (
      <div className="border-b border-[#dbdbdb] bg-orange-50 px-4 py-4 text-sm text-[#303030] dark:border-[#30363d] dark:bg-[#2d2218] dark:text-[#e6edf3]">
        <p className="m-0">{message}</p>
        <button
          className="mt-3 cursor-pointer rounded-md border border-[#868686] bg-[#333238] px-3 py-1.5 text-[13px] font-semibold text-white transition enabled:hover:bg-[#44434a] disabled:cursor-wait disabled:opacity-60 dark:border-[#5c5c66] dark:bg-[#28272d] dark:enabled:hover:bg-[#35343c]"
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
