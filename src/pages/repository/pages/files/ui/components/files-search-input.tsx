import { Magnifier } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { RepositoryFilesSearchModel } from '../../model/repository-files-search';

const searchInputClassName =
  'w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500';

export const FilesSearchInput = observer(
  ({
    searchModel,
    triggerRef,
  }: {
    searchModel: RepositoryFilesSearchModel;
    triggerRef: (node: HTMLElement | null) => void;
  }) => (
    <label
      ref={triggerRef}
      className={cn(
        'glass-input flex items-center gap-2 rounded-[10px] px-3 py-1.5',
        searchModel.isPanelOpen && 'border-[var(--glass-accent)]',
      )}
    >
      <Magnifier width={16} height={16} className="shrink-0 text-slate-400" />
      <input
        className={searchInputClassName}
        aria-label={t('files.searchFilesAndContents')}
        placeholder={t('files.searchFilesAndContents2')}
        type="search"
        value={searchModel.searchQuery}
        onChange={(event) => searchModel.setSearchQuery(event.target.value)}
        onFocus={searchModel.open}
      />
    </label>
  ),
);
