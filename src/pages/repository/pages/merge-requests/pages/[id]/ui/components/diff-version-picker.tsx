import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GitLabMergeRequestVersionDC } from "@/shared/api/gitlab";
import { cn } from "@/shared/lib/cn";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getVersionLabel = (
  version: GitLabMergeRequestVersionDC,
  index: number,
  total: number,
) => {
  if (index === 0) {
    return "последняя версия";
  }

  const pushNumber = total - index;
  return `push ${pushNumber} от ${formatDate(version.created_at)}`;
};

interface DiffVersionPickerProps {
  versions: GitLabMergeRequestVersionDC[];
  selectedVersionId: number | null;
  onSelectVersion: (id: number | null) => void;
}

export const DiffVersionPicker = observer(
  ({ versions, selectedVersionId, onSelectVersion }: DiffVersionPickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const close = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
      if (!isOpen) {
        return;
      }

      const handlePointerDown = (event: MouseEvent) => {
        const target = event.target as Node;
        if (
          popupRef.current?.contains(target) ||
          triggerRef.current?.contains(target)
        ) {
          return;
        }

        close();
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          close();
        }
      };

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [isOpen, close]);

    const selectedVersion = selectedVersionId
      ? versions.find((v) => v.id === selectedVersionId)
      : null;

    const selectedIndex = selectedVersion
      ? versions.indexOf(selectedVersion)
      : 0;

    const currentLabel =
      versions.length > 0
        ? getVersionLabel(
            selectedVersion ?? versions[0],
            selectedIndex,
            versions.length,
          )
        : "последняя версия";

    const handleSelect = useCallback(
      (id: number | null) => {
        onSelectVersion(id);
        close();
      },
      [onSelectVersion, close],
    );

    return (
      <div className="relative inline-flex">
        <button
          ref={triggerRef}
          className={cn(
            "glass-control inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
            isOpen && "border-[var(--glass-accent)] bg-[var(--glass-selected)] text-[var(--glass-accent)]",
          )}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {currentLabel}
          <svg
            aria-hidden
            className="h-3 w-3"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M4.427 6.427a.75.75 0 0 1 1.06 0L8 8.94l2.513-2.513a.75.75 0 1 1 1.06 1.06l-3.043 3.043a.75.75 0 0 1-1.06 0L4.427 7.487a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>

        {isOpen && (
          <div
            ref={popupRef}
            className="glass-overlay absolute top-[calc(100%+4px)] left-0 z-50 min-w-[200px] rounded-lg p-1"
            role="listbox"
          >
            {versions.map((version, index) => {
              const isSelected =
                (selectedVersionId === null && index === 0) ||
                selectedVersionId === version.id;

              return (
                <button
                  key={version.id}
                  className={cn(
                    "flex w-full items-center rounded-md px-3 py-1.5 text-left text-xs transition hover:bg-[var(--glass-hover)]",
                    isSelected &&
                      "bg-[var(--glass-selected)] font-semibold text-[var(--glass-accent)]",
                  )}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() =>
                    handleSelect(index === 0 ? null : version.id)
                  }
                >
                  {getVersionLabel(version, index, versions.length)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);
