import { observer } from "mobx-react-lite";
import type {
  NavTreeGroup,
  NavTreeItem,
  NavTreeStore,
} from "@/globals/stores/nav-tree";
import { cn } from "@/shared/lib/cn";

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

export const NavTreeSidebar = observer(
  ({
    store,
    activeItemId,
    onSelect,
    onClose,
    onSelectGroup,
  }: {
    store: NavTreeStore;
    activeItemId: string | null;
    onSelect: (item: NavTreeItem) => void;
    onClose: (item: NavTreeItem) => void;
    onSelectGroup: (group: NavTreeGroup) => void;
  }) => {
    if (store.items.length === 0) {
      return null;
    }

    const groups = store.groups
      .map((group) => ({
        ...group,
        items: store.items.filter((item) => item.groupId === group.id),
      }))
      .filter((group) => group.items.length > 0);

    return (
      <aside
        aria-label="Рабочая область"
        aria-expanded={store.isExpanded}
        data-expanded={store.isExpanded}
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 max-w-[calc(100vw-1rem)] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-gray-900",
        )}
        style={{
          transform: store.isExpanded
            ? "translateX(0)"
            : "translateX(calc(-100% + 16px))",
        }}
        onMouseEnter={store.expand}
        onMouseLeave={store.collapse}
      >
        {!store.isExpanded && (
          <button
            className="absolute inset-y-0 right-0 z-10 grid w-4 cursor-pointer place-items-center border-0 border-l border-slate-300 bg-slate-100/90 p-0 hover:bg-orange-100 dark:border-slate-700 dark:bg-slate-800/90 dark:hover:bg-orange-950"
            type="button"
            aria-label="Раскрыть рабочую область"
            title="Раскрыть рабочую область"
            onClick={store.expand}
          >
            <span className="h-8 w-0.5 rounded-full bg-slate-400 dark:bg-slate-500" />
          </button>
        )}
        <div className="shrink-0 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="m-0 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Рабочая область
          </h2>
        </div>

        <nav
          aria-label="Навигационное дерево"
          className="flex min-h-0 flex-1 gap-4 overflow-auto p-3 lg:flex-col lg:gap-3"
        >
          {groups.map((group) => (
            <section className="min-w-48 lg:min-w-0" key={group.id}>
              <h3
                className="mb-1 truncate px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500"
                title={group.title}
              >
                {group.kind ? (
                  <button
                    className="w-full cursor-pointer border-0 bg-transparent p-0 text-left text-inherit transition hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
                    type="button"
                    title={group.title}
                    aria-label={`Открыть ${group.title}`}
                    onClick={() => onSelectGroup(group)}
                  >
                    {group.title}
                  </button>
                ) : (
                  group.title
                )}
              </h3>
              <ul className="m-0 flex list-none gap-1 p-0 lg:flex-col">
                {group.items.map((item) => {
                  const isActive = activeItemId === item.id;

                  return (
                    <li className="min-w-48 lg:min-w-0" key={item.id}>
                      <div
                        className={cn(
                          "group flex items-center rounded-lg transition",
                          isActive
                            ? "bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                        )}
                      >
                        <button
                          className="min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent px-2.5 py-2 text-left text-sm"
                          type="button"
                          title={item.title}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => onSelect(item)}
                        >
                          {item.title}
                        </button>
                        <button
                          className="mr-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-slate-400 opacity-100 transition hover:bg-black/5 hover:text-slate-700 focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-slate-200"
                          type="button"
                          aria-label={`Закрыть ${item.title}`}
                          title="Закрыть элемент"
                          onClick={() => onClose(item)}
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
      </aside>
    );
  },
);
