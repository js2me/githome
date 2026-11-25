import { observer } from 'mobx-react-lite';
import { GitLabMarkdown } from '@/shared/ui/gitlab-markdown/gitlab-markdown';
import { StatusMessage } from '@/shared/ui/status-message';
import type { FilesPageVM } from '../../model';
import { HighlightedSourceCode } from './highlighted-source-code';

export const FileViewer = observer(({ model }: { model: FilesPageVM }) => {
  if (!model.selectedFilePath) {
    return (
      <div className="glass-panel flex min-h-[320px] flex-1 items-center justify-center rounded-xl border-dashed p-6 text-fg-muted text-sm">
        Выберите файл слева, чтобы посмотреть содержимое.
      </div>
    );
  }

  return (
    <article className="glass-panel flex min-h-[320px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
      <header className="border-slate-200 border-b px-4 py-3 dark:border-slate-800">
        <h3 className="truncate font-semibold text-slate-700 text-sm dark:text-slate-300">
          {model.selectedFilePath}
        </h3>
      </header>

      <div className="min-h-0 flex-1 overflow-auto bg-white p-4 dark:bg-gray-900">
        {model.isFileContentLoading && (
          <StatusMessage>Загружаем файл...</StatusMessage>
        )}

        {model.fileContentErrorMessage && !model.isFileContentLoading && (
          <StatusMessage error>{model.fileContentErrorMessage}</StatusMessage>
        )}

        {model.fileContent &&
          !model.isFileContentLoading &&
          model.isMarkdownFile && (
            <GitLabMarkdown
              connection={model.connection}
              projectPath={model.projectPath}
              projectId={model.project?.id ?? 0}
              text={model.fileContent}
              className="text-slate-800 text-sm leading-normal dark:text-slate-300"
            />
          )}

        {model.imageUrl && !model.isFileContentLoading && model.isImageFile && (
          <div className="flex justify-center">
            <img
              src={model.imageUrl}
              alt={model.selectedFileName ?? 'Предпросмотр изображения'}
              className="h-64 w-64 rounded-lg border border-slate-200 bg-slate-50 object-contain dark:border-slate-700 dark:bg-gray-950"
            />
          </div>
        )}

        {model.fileContent &&
          !model.isFileContentLoading &&
          !model.isMarkdownFile && (
            <HighlightedSourceCode
              filePath={model.selectedFilePath}
              content={model.fileContent}
            />
          )}
      </div>
    </article>
  );
});
