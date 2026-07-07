import { observer } from "mobx-react-lite";
import { cn } from "@/shared/lib/cn";
import { Popup } from "@/shared/ui/popup";
import type { FilesPageVM } from "../../model";

export const BranchPicker = observer(({ model }: { model: FilesPageVM }) => {
  const currentLabel = model.branchRef ?? "Ветка";

  return (
    <Popup
      isOpen={model.isBranchPickerOpen}
      onClose={model.closeBranchPicker}
      className="inline-flex"
    >
      <Popup.Trigger>
        {(setTriggerRef) => (
          <button
            ref={setTriggerRef}
            className={cn(
              "inline-flex max-w-[min(100vw-12rem,320px)] items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-sm font-semibold transition",
              model.isBranchPickerOpen
                ? "border-brand bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-gray-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-950",
            )}
            type="button"
            onClick={model.toggleBranchPicker}
            aria-expanded={model.isBranchPickerOpen}
            aria-haspopup="listbox"
          >
            <span className="min-w-0 truncate">{currentLabel}</span>
            <svg
              aria-hidden
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M4.427 6.427a.75.75 0 0 1 1.06 0L8 8.94l2.513-2.513a.75.75 0 1 1 1.06 1.06l-3.043 3.043a.75.75 0 0 1-1.06 0L4.427 7.487a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        )}
      </Popup.Trigger>

      <Popup.Panel ariaLabel="Ветки" className="left-0 w-[min(320px,calc(100vw-2.5rem))] p-1">
        {model.isBranchesLoading && (
          <p className="px-3 py-2 text-sm text-slate-500">Загружаем ветки...</p>
        )}

        {model.branchesErrorMessage && !model.isBranchesLoading && (
          <p className="px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
            {model.branchesErrorMessage}
          </p>
        )}

        {!model.isBranchesLoading &&
          !model.branchesErrorMessage &&
          model.branchOptions.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-500">Ветки не найдены.</p>
          )}

        <div className="max-h-64 overflow-y-auto" role="listbox">
          {model.branchOptions.map((branch) => {
            const isSelected = model.branchRef === branch.name;

            return (
              <button
                key={branch.name}
                className={cn(
                  "flex w-full items-center border-none bg-transparent px-3 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800",
                  isSelected &&
                  "bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300",
                )}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => model.selectBranch(branch.name)}
              >
                <span className="min-w-0 truncate">{branch.name}</span>
                {branch.default && (
                  <span className="ml-2 shrink-0 text-xs font-normal text-slate-400">
                    default
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Popup.Panel>
    </Popup>
  );
});
