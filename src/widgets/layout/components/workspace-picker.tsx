import { ChevronDown, Layers } from "@gravity-ui/icons";
import { observer } from "mobx-react-lite";
import { useEffect, useId, useRef, useState } from "react";
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

export const WorkspacePicker = observer(
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
    const [isExpanded, setIsExpanded] = useState(false);
    const workspaceRef = useRef<HTMLElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const navigationId = useId();
    const hasItems = store.items.length > 0;

    useEffect(() => {
      if (!hasItems) {
        setIsExpanded(false);
      }
    }, [hasItems]);

    useEffect(() => {
      if (!hasItems || !isExpanded) {
        return;
      }

      const closeOnOutsidePointer = (event: PointerEvent) => {
        if (!workspaceRef.current?.contains(event.target as Node)) {
          setIsExpanded(false);
        }
      };
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key !== "Escape" || event.defaultPrevented) {
          return;
        }

        if (workspaceRef.current?.contains(document.activeElement)) {
          event.preventDefault();
          triggerRef.current?.focus({ preventScroll: true });
        }
        setIsExpanded(false);
      };

      document.addEventListener("pointerdown", closeOnOutsidePointer);
      document.addEventListener("keydown", closeOnEscape);
      return () => {
        document.removeEventListener("pointerdown", closeOnOutsidePointer);
        document.removeEventListener("keydown", closeOnEscape);
      };
    }, [hasItems, isExpanded]);

    if (!hasItems) {
      return null;
    }

    const closeAfterNavigation = () => {
      setIsExpanded(false);
      triggerRef.current?.focus({ preventScroll: true });
    };

    const groups = store.groups
      .map((group) => ({
        ...group,
        items: store.items.filter((item) => item.groupId === group.id),
      }))
      .filter((group) => group.items.length > 0);

    return (
      <aside
        ref={workspaceRef}
        aria-label="Рабочая область"
        data-expanded={isExpanded}
        className="sticky top-3 z-50 mt-3 ml-3 flex flex-col items-start self-start sm:ml-4 lg:ml-6"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") {
            setIsExpanded(true);
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse" && !event.currentTarget.querySelector("nav :focus-visible")) {
            setIsExpanded(false);
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsExpanded(false);
          }
        }}
      >
        <button
          ref={triggerRef}
          className={cn(
            "relative z-10 inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border border-border-default bg-canvas-overlay px-3 text-xs font-semibold text-fg-default hover:text-brand focus-visible:outline-2 focus-visible:outline-brand",
            isExpanded && "rounded-b-none border-b-transparent",
          )}
          type="button"
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? navigationId : undefined}
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          <Layers className="size-3.5 text-fg-muted" aria-hidden="true" />
          Рабочая область
          <ChevronDown
            className={cn("size-3 text-fg-muted motion-safe:transition-transform", isExpanded && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        {isExpanded && (
          <nav
            id={navigationId}
            aria-label="Навигационное дерево"
            className="absolute top-full left-0 -mt-px flex max-h-[min(55dvh,24rem)] w-80 max-w-[calc(100vw-1.5rem)] origin-top-left flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl rounded-tl-none border border-border-default bg-canvas-overlay p-3 shadow-xl motion-safe:transition-[opacity,scale] motion-safe:duration-150 motion-safe:starting:scale-y-95 motion-safe:starting:opacity-0"
          >
            {groups.map((group) => (
              <section className="min-w-0 shrink-0" key={group.id}>
                <h3
                  className="mb-1 truncate px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500"
                  title={group.title}
                >
                  {group.kind ? (
                    <button
                      className="block w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-inherit transition hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
                      type="button"
                      title={group.title}
                      aria-label={`Открыть ${group.title}`}
                      onClick={() => {
                        closeAfterNavigation();
                        onSelectGroup(group);
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
                    const isActive = activeItemId === item.id;

                    return (
                      <li className="min-w-0" key={item.id}>
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
                            onClick={() => {
                              closeAfterNavigation();
                              onSelect(item);
                            }}
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
        )}
      </aside>
    );
  },
);
