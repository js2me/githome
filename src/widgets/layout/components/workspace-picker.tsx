import { ChevronDown, Layers } from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { WorkspacePickerVM } from '../model/workspace-picker';

const CloseIcon = () => (
  <svg
    aria-hidden="true"
    className="size-4"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
);

export const WorkspacePicker = withViewModel(WorkspacePickerVM, ({ model }) => {
  const navigationId = useId();
  const {
    expanded: isExpanded,
    workspace,
    trigger,
    groups,
    setExpanded,
    closeAndFocusTrigger,
  } = model;
  const store = model.globals.stores.navTree;
  const navigation = model.globals.navigation.mergeRequests;
  if (!store.items.length) return null;

  return (
    <aside
      ref={workspace}
      aria-label="Рабочая область"
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
        Рабочая область
        <span
          aria-hidden
          className="rounded-md bg-[var(--glass-selected)] px-1.5 text-[11px] text-[var(--glass-accent)]"
        >
          {store.items.length}
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
          aria-label="Навигационное дерево"
          className="glass-overlay absolute top-full left-0 -mt-px flex max-h-[min(55dvh,24rem)] w-80 max-w-[calc(100vw-1.5rem)] origin-top-left flex-col gap-3 overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl rounded-tl-none p-3 motion-safe:starting:scale-y-95 motion-safe:starting:opacity-0 motion-safe:transition-[opacity,scale] motion-safe:duration-150"
        >
          {groups.map((group) => (
            <section className="min-w-0 shrink-0" key={group.id}>
              <h3
                className="mb-1 truncate px-2 font-semibold text-[11px] text-fg-muted"
                title={group.title}
              >
                {group.kind ? (
                  <button
                    className="block w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-inherit transition hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
                    type="button"
                    title={group.title}
                    aria-label={`Открыть ${group.title}`}
                    onClick={() => {
                      closeAndFocusTrigger();
                      navigation.selectGroup(group);
                    }}
                  >
                    {group.title}
                  </button>
                ) : (
                  group.title
                )}
              </h3>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {group.items.map((item) => {
                  const isActive = navigation.activeItemId === item.id;

                  return (
                    <li className="min-w-0" key={item.id}>
                      <div
                        className={cn(
                          'group flex items-center rounded-lg transition',
                          isActive
                            ? 'bg-[var(--glass-selected)] text-[var(--glass-accent)]'
                            : 'text-fg-default hover:bg-[var(--glass-hover)]',
                        )}
                      >
                        <button
                          className="min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent px-2.5 py-2 text-left text-sm"
                          type="button"
                          title={item.title}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={() => {
                            closeAndFocusTrigger();
                            navigation.select(item);
                          }}
                        >
                          {item.title}
                        </button>
                        <button
                          className="mr-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-slate-400 opacity-100 transition hover:bg-black/5 hover:text-slate-700 focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-slate-200"
                          type="button"
                          aria-label={`Закрыть ${item.title}`}
                          title="Закрыть элемент"
                          onClick={() => navigation.close(item)}
                        >
                          <CloseIcon />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      )}
    </aside>
  );
});
