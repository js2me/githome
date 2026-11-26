import { ArrowLeft } from '@gravity-ui/icons';
import { Link } from 'mobx-route/react';
import { withViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { StatusMessage } from '@/shared/ui/status-message';
import { FilesPageVM } from '../model';
import { BranchPicker } from './components/branch-picker';
import { CommitPicker } from './components/commit-picker';
import { FileTree } from './components/file-tree';
import { FileViewer } from './components/file-viewer';
import { FilesSearch } from './components/files-search';

export const FilesPage = withViewModel(FilesPageVM, ({ model }) => {
  const { mergeRequestHref } = model;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {mergeRequestHref && (
          <Link
            className="glass-control inline-flex h-8 items-center gap-2 rounded-lg px-2.5 font-semibold text-xs"
            href={mergeRequestHref}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t('files.backToMergeRequest')}
          </Link>
        )}
        <h2 className="font-semibold text-[22px]">{t('common.files')}</h2>
        <BranchPicker model={model} />
        <CommitPicker model={model} />
        <FilesSearch model={model} />
      </div>

      {model.ref ? (
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row">
          <div className="w-full min-w-0 shrink-0 self-start lg:w-[min(100%,320px)]">
            <div className="lg:sticky lg:top-4">
              <FileTree treeModel={model.treeModel} />
            </div>
          </div>

          <FileViewer model={model} />
        </div>
      ) : (
        <StatusMessage>
          {model.project
            ? t('files.loadingBranch')
            : t('files.loadingRepository')}
        </StatusMessage>
      )}
    </section>
  );
});
