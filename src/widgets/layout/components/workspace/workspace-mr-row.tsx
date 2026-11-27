import { observer } from 'mobx-react-lite';
import type { MergeRequestNavItem } from '@/features/workspace-navigation';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { WorkspacePickerVM } from '../../model/workspace/workspace-picker';
import { CloseIcon } from '../close-icon';
import { WorkspaceMrStatuses } from './workspace-mr-statuses';

export const WorkspaceMrRow = observer(function WorkspaceMrRow({
  item,
  model,
}: {
  item: MergeRequestNavItem;
  model: WorkspacePickerVM;
}) {
  const navigation = model.globals.navigation.mergeRequests;
  const isActive = navigation.activeItemId === item.id;
  const title = item.title || t('common.mergeRequest');
  return (
    <li
      className={cn(
        'group flex min-w-0 items-center rounded-lg transition',
        isActive
          ? 'bg-[var(--glass-selected)] text-[var(--glass-accent)]'
          : 'text-fg-default hover:bg-[var(--glass-hover)]',
      )}
    >
      <button
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-brand"
        type="button"
        title={title}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => {
          model.closeAndFocusTrigger();
          navigation.select(item);
        }}
      >
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <WorkspaceMrStatuses
          status={item.payload.status}
          review={model.reviewFor(item.id)}
        />
      </button>
      <button
        className="mr-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-fg-muted transition hover:bg-black/5 hover:text-fg-default focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 dark:hover:bg-white/10"
        type="button"
        aria-label={t('navigation.close', { v1: title })}
        title={t('navigation.closeItem')}
        onClick={() => navigation.close(item)}
      >
        <CloseIcon />
      </button>
    </li>
  );
});
