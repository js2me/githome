import { ChevronDown, Layers } from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { WorkspacePickerVM } from '../../model/workspace/workspace-picker';
import { WorkspaceTreeBranch } from './workspace-tree-branch';

export const WorkspacePicker = withViewModel(WorkspacePickerVM, ({ model }) => {
  const navigationId = useId();
  const {
    expanded: isExpanded,
    workspace,
    trigger,
    branches,
    items,
    setExpanded,
  } = model;
  if (!items.length) return null;

  return (
    <aside
      ref={workspace}
      aria-label={t('navigation.workspace')}
      data-expanded={isExpanded}
      className="sticky top-3 z-50 mt-3 ml-3 flex flex-col items-start self-start sm:ml-4 lg:ml-6"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') {
          setExpanded(true);
        }
      }}
      onPointerLeave={(event) => {
        if (
          event.pointerType === 'mouse' &&
          !event.currentTarget.querySelector('nav :focus-visible')
        ) {
          setExpanded(false);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setExpanded(false);
        }
      }}
    >
      <button
        ref={trigger}
        className={cn(
          'glass-control relative z-10 inline-flex h-9 items-center gap-2 rounded-xl px-3 font-semibold text-xs',
          isExpanded && 'rounded-b-none border-b-transparent',
        )}
        type="button"
        aria-expanded={isExpanded}
        aria-controls={isExpanded ? navigationId : undefined}
        onClick={() => setExpanded(!isExpanded)}
      >
        <Layers className="size-3.5 text-fg-muted" aria-hidden="true" />
        {t('navigation.workspace')}
        <span
          aria-hidden
          className="rounded-md bg-[var(--glass-selected)] px-1.5 text-[11px] text-[var(--glass-accent)]"
        >
          {items.length}
        </span>
        <ChevronDown
          className={cn(
            'size-3 text-fg-muted motion-safe:transition-transform',
            isExpanded && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <nav
          id={navigationId}
          aria-label={t('navigation.navigationTree')}
          className="glass-overlay absolute top-full left-0 -mt-px flex max-h-[min(55dvh,24rem)] w-[26rem] max-w-[calc(100vw-1.5rem)] origin-top-left flex-col gap-3 overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl rounded-tl-none p-3 motion-safe:starting:scale-y-95 motion-safe:starting:opacity-0 motion-safe:transition-[opacity,scale] motion-safe:duration-150"
        >
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {branches.map((branch) => (
              <WorkspaceTreeBranch
                key={branch.id}
                branch={branch}
                model={model}
              />
            ))}
          </ul>
        </nav>
      )}
    </aside>
  );
});
