import { ChevronDown, Folder, FolderCode } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import type { WorkspaceBranch } from '@/features/workspace-navigation';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { WorkspacePickerVM } from '../../model/workspace/workspace-picker';
import { WorkspaceMrRow } from './workspace-mr-row';

export const WorkspaceTreeBranch = observer(function WorkspaceTreeBranch({
  branch,
  model,
}: {
  branch: WorkspaceBranch;
  model: WorkspacePickerVM;
}) {
  const childrenId = useId();
  const expanded = !model.collapsed.has(branch.id);
  const isNamespace = branch.kind === 'namespace';
  const path = isNamespace ? branch.path : branch.group.title;
  const label =
    branch.label && branch.label !== 'Загрузка репозитория…'
      ? branch.label
      : t('common.loadingRepository');
  const Icon = isNamespace ? Folder : FolderCode;
  return (
    <li className="min-w-0">
      <div className="flex min-w-0 items-center rounded-lg text-fg-muted hover:bg-[var(--glass-hover)]">
        <button
          aria-controls={childrenId}
          aria-expanded={expanded}
          aria-label={t(
            expanded ? 'navigation.collapseBranch' : 'navigation.expandBranch',
            { v1: label },
          )}
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
          type="button"
          onClick={() => model.toggleBranch(branch.id)}
        >
          <ChevronDown
            className={cn('size-3', !expanded && '-rotate-90')}
            aria-hidden
          />
        </button>
        <button
          aria-label={t('navigation.open2', { v1: path || label })}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-2 text-left font-semibold text-xs hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
          title={path || label}
          type="button"
          onClick={() => {
            model.closeAndFocusTrigger();
            const navigation = model.globals.navigation.mergeRequests;
            if (isNamespace)
              navigation.selectNamespace(branch.connectionId, branch.path);
            else navigation.selectGroup(branch.group);
          }}
        >
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </button>
      </div>
      <ul
        id={childrenId}
        hidden={!expanded}
        className="m-0 ml-2.5 list-none space-y-0.5 border-[var(--glass-border)] border-l pl-1.5"
      >
        {expanded &&
          (isNamespace
            ? branch.children.map((child) => (
                <WorkspaceTreeBranch
                  key={child.id}
                  branch={child}
                  model={model}
                />
              ))
            : branch.items.map((item) => (
                <WorkspaceMrRow key={item.id} item={item} model={model} />
              )))}
      </ul>
    </li>
  );
});
