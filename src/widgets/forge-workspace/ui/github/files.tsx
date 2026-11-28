import { ChevronRight, File, Folder, HardDrive } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { HighlightedSourceCode } from '@/shared/ui/highlighted-source-code';
import type { GithubRepositoryModel } from '../../model/github/repository';
import { ForgeLoadMore } from '../load-more';
import { ForgeQueryStatus } from '../query-status';

const controlClass =
  'cursor-pointer rounded p-1 text-fg-muted hover:bg-[var(--glass-hover)] hover:text-fg-default';

export const GithubFiles = observer(
  ({ model }: { model: GithubRepositoryModel }) => {
    const {
      branch,
      directory,
      file,
      entries,
      branches,
      preview,
      rootTree,
      defaultBranch,
    } = model;
    const available = branches.data?.pages.flatMap(({ items }) => items);
    const options = new Set([
      defaultBranch.data,
      branch,
      ...(available?.map(({ name }) => name) ?? []),
    ]);
    return (
      <section className="grid min-w-0 gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-[22px]">{t('common.files')}</h2>
          <select
            aria-label={t('files.branches')}
            className="glass-control max-w-full rounded-lg px-3 py-2 text-sm"
            value={branch ?? ''}
            disabled={!branch}
            onChange={(event) => model.selectBranch(event.target.value)}
          >
            {!branch && <option value="">{t('files.loadingBranch')}</option>}
            {[...options]
              .filter((item): item is string => Boolean(item))
              .map((name) => (
                <option value={name} key={name}>
                  {name}
                </option>
              ))}
          </select>
          <ForgeLoadMore query={branches} label={t('files.loadMoreBranches')} />
        </div>
        <ForgeQueryStatus query={defaultBranch} />
        <ForgeQueryStatus query={branches} />
        <ForgeQueryStatus query={rootTree} />
        {rootTree.data === null && (
          <p role="status">{t('forge.branchNotFound')}</p>
        )}
        {rootTree.data && (
          <>
            <nav
              aria-label={t('files.contents')}
              className="flex min-w-0 flex-wrap items-center gap-1 font-mono text-xs"
            >
              <button
                type="button"
                className={controlClass}
                onClick={() => model.selectDirectory([])}
              >
                {model.scope?.repository}
              </button>
              {directory.map((name, index) => (
                <span
                  className="inline-flex items-center gap-1"
                  key={directory.slice(0, index + 1).join('/')}
                >
                  <ChevronRight width={12} height={12} aria-hidden />
                  <button
                    type="button"
                    className={controlClass}
                    onClick={() =>
                      model.selectDirectory(directory.slice(0, index + 1))
                    }
                  >
                    {name}
                  </button>
                </span>
              ))}
            </nav>
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row">
              <div className="glass-panel w-full min-w-0 shrink-0 self-start overflow-hidden rounded-lg lg:w-[min(100%,320px)]">
                <ForgeQueryStatus query={entries} />
                {entries.data?.length === 0 && (
                  <p className="p-3 text-fg-muted text-sm">
                    {t('files.noFilesFound')}
                  </p>
                )}
                <ul className="divide-y divide-[var(--glass-border)]">
                  {entries.data?.map((entry) => {
                    const isFolder = entry.type === 'tree';
                    const Icon = isFolder
                      ? Folder
                      : entry.type === 'commit'
                        ? HardDrive
                        : File;
                    return (
                      <li key={entry.path}>
                        <button
                          type="button"
                          aria-current={entry.path === file || undefined}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--glass-hover)] disabled:cursor-default disabled:opacity-60',
                            entry.path === file && 'bg-[var(--glass-selected)]',
                          )}
                          disabled={entry.type === 'commit'}
                          onClick={() =>
                            isFolder
                              ? model.selectDirectory([
                                  ...directory,
                                  entry.path,
                                ])
                              : model.selectFile(entry.path)
                          }
                        >
                          <Icon
                            width={15}
                            height={15}
                            aria-hidden
                            className="shrink-0 text-fg-muted"
                          />
                          <span className="break-all">{entry.path}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <article className="glass-panel min-h-[320px] min-w-0 flex-1 overflow-hidden rounded-lg">
                {file && (
                  <h3 className="break-all border-[var(--glass-border)] border-b px-4 py-3 font-mono font-semibold text-sm">
                    {[...directory, file].join('/')}
                  </h3>
                )}
                <div className="p-4">
                  <ForgeQueryStatus query={preview} />
                  {!file && (
                    <p className="text-fg-muted text-sm">
                      {t('files.selectAFileOnTheLeftTo')}
                    </p>
                  )}
                  {file &&
                    entries.data &&
                    !entries.data.some(
                      ({ path, type }) => path === file && type === 'blob',
                    ) && <p role="status">{t('forge.previewUnavailable')}</p>}
                  {preview.data?.text != null && (
                    <HighlightedSourceCode
                      filePath={file ?? ''}
                      content={preview.data.text}
                    />
                  )}
                  {preview.data?.image && (
                    <img
                      alt={file ?? t('files.imagePreview')}
                      className="mx-auto max-h-[60vh] object-contain"
                      src={preview.data.image}
                    />
                  )}
                </div>
              </article>
            </div>
          </>
        )}
      </section>
    );
  },
);
