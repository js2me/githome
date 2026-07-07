import { observer } from "mobx-react-lite";
import { GitLabMarkdown } from "@/shared/ui/gitlab-markdown/gitlab-markdown";
import { StatusMessage } from "@/shared/ui/status-message";
import type { FilesVM } from "../../model";
import { HighlightedSourceCode } from "./highlighted-source-code";

export const FileViewer = observer(({ model }: { model: FilesVM }) => {
  if (!model.selectedFilePath) {
    return (
      <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-gray-900">
        Выберите файл слева, чтобы посмотреть содержимое.
      </div>
    );
  }

  return (
    <article className="flex min-h-[320px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gray-900">
      <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h3 className="truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
          {model.selectedFilePath}
        </h3>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {model.isFileContentLoading && (
          <StatusMessage>Загружаем файл...</StatusMessage>
        )}

        {model.fileContentErrorMessage && !model.isFileContentLoading && (
          <StatusMessage error>{model.fileContentErrorMessage}</StatusMessage>
        )}

        {model.fileContent && !model.isFileContentLoading && model.isMarkdownFile && (
          <GitLabMarkdown
            connection={model.connection}
            projectPath={model.projectPath}
            projectId={model.project?.id ?? 0}
            text={model.fileContent}
            className="text-sm leading-normal text-slate-800 dark:text-slate-300"
          />
        )}

        {model.fileContent && !model.isFileContentLoading && !model.isMarkdownFile && (
          <HighlightedSourceCode
            filePath={model.selectedFilePath}
            content={model.fileContent}
          />
        )}
      </div>
    </article>
  );
});
