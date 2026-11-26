import { Magnifier } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { cn } from '@/shared/lib/cn';
import { FileTypeIcon } from '@/shared/ui/file-type-icon';
import { Popup } from '@/shared/ui/popup';
import type { FilesPageVM } from '../../model';
import type { FilesSearchMode } from '../../model/repository-files-search';

const modeButtonClassName =
  'rounded-md px-2.5 py-1 text-xs font-semibold transition';

const searchInputClassName =
  'w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500';

export const FilesSearch = observer(({ model }: { model: FilesPageVM }) => {
  const { searchModel } = model;

  return (
    <Popup
      isOpen={searchModel.isPanelOpen}
      onClose={searchModel.close}
      className="ml-auto w-full min-w-[220px] max-w-md"
    >
      <Popup.Trigger>
        {(setTriggerRef) => (
          <label
            ref={setTriggerRef}
            className={cn(
              'glass-input flex items-center gap-2 rounded-[10px] px-3 py-1.5',
              searchModel.isPanelOpen && 'border-[var(--glass-accent)]',
            )}
          >
            <Magnifier
              width={16}
              height={16}
              className="shrink-0 text-slate-400"
            />
            <input
              className={searchInputClassName}
              aria-label="Поиск файлов и содержимого"
              placeholder="Поиск файлов и содержимого..."
              type="search"
              value={searchModel.searchQuery}
              onChange={(event) =>
                searchModel.setSearchQuery(event.target.value)
              }
              onFocus={searchModel.open}
            />
          </label>
        )}
      </Popup.Trigger>

      <Popup.Panel
        ariaLabel="Поиск по репозиторию"
        className="right-0 left-auto w-[min(480px,calc(100vw-2.5rem))] p-0"
      >
        <div className="flex gap-1 border-slate-200 border-b p-2 dark:border-slate-800">
          {(['files', 'content'] as FilesSearchMode[]).map((mode) => (
            <button
              key={mode}
              className={cn(
                modeButtonClassName,
                searchModel.searchMode === mode
                  ? 'bg-brand-selection text-brand-ink'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
              type="button"
              onClick={() => searchModel.setSearchMode(mode)}
            >
              {mode === 'files' ? 'Файлы' : 'Содержимое'}
            </button>
          ))}
        </div>

        <div className="max-h-80 overflow-y-auto p-1">
          {searchModel.isQueryTooShort && (
            <p className="px-3 py-2 text-slate-500 text-sm">
              Введите минимум 2 символа.
            </p>
          )}

          {searchModel.isLoading && (
            <p className="px-3 py-2 text-slate-500 text-sm">Ищем...</p>
          )}

          {searchModel.errorMessage && !searchModel.isLoading && (
            <p className="px-3 py-2 text-rose-600 text-sm dark:text-rose-400">
              {searchModel.errorMessage}
            </p>
          )}

          {!searchModel.isQueryTooShort &&
            !searchModel.isLoading &&
            !searchModel.errorMessage &&
            searchModel.searchMode === 'files' &&
            searchModel.fileResults.length === 0 && (
              <p className="px-3 py-2 text-slate-500 text-sm">
                Файлы не найдены.
              </p>
            )}

          {!searchModel.isQueryTooShort &&
            !searchModel.isLoading &&
            !searchModel.errorMessage &&
            searchModel.searchMode === 'content' &&
            searchModel.contentResults.length === 0 && (
              <p className="px-3 py-2 text-slate-500 text-sm">
                Совпадений не найдено.
              </p>
            )}

          {searchModel.searchMode === 'files' &&
            !searchModel.isQueryTooShort &&
            searchModel.fileResults.map((item) => (
              <button
                key={item.path}
                className="flex w-full items-center gap-2 rounded-md border-none bg-transparent px-3 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                type="button"
                onClick={() => searchModel.selectFile(item.path)}
              >
                <FileTypeIcon path={item.path} className="shrink-0" />
                <span className="min-w-0 truncate font-medium">
                  {item.name}
                </span>
                <span className="ml-auto min-w-0 truncate text-slate-400 text-xs">
                  {item.path}
                </span>
              </button>
            ))}

          {searchModel.searchMode === 'content' &&
            !searchModel.isQueryTooShort &&
            searchModel.contentResults.map((result) => (
              <button
                key={`${result.path}:${result.startline}`}
                className="flex w-full flex-col gap-1 rounded-md border-none bg-transparent px-3 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                type="button"
                onClick={() => searchModel.selectContentResult(result)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileTypeIcon path={result.path} className="shrink-0" />
                  <span className="min-w-0 truncate font-medium">
                    {result.path}
                  </span>
                  <span className="shrink-0 text-slate-400 text-xs">
                    :{result.startline}
                  </span>
                </span>
                <span className="line-clamp-2 pl-6 font-mono text-slate-500 text-xs dark:text-slate-400">
                  {result.data.trim()}
                </span>
              </button>
            ))}
        </div>
      </Popup.Panel>
    </Popup>
  );
});
