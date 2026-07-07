import { observer } from "mobx-react-lite";
import { cn } from "@/shared/lib/cn";
import { Popup } from "@/shared/ui/popup";
import type { FilesPageVM } from "../../model";
import { CommitsVirtualList } from "./commits-virtual-list";

const pickerButtonClassName =
  "inline-flex max-w-[min(100vw-12rem,320px)] items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-sm font-semibold transition";

export const CommitPicker = observer(({ model }: { model: FilesPageVM }) => {
  const { commitsModel } = model;

  return (
    <Popup
      isOpen={model.isCommitPickerOpen}
      onClose={model.closeCommitPicker}
      className="inline-flex"
    >
      <Popup.Trigger>
        {(setTriggerRef) => (
          <button
            ref={setTriggerRef}
            className={cn(
              pickerButtonClassName,
              model.isCommitPickerOpen
                ? "border-brand bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-gray-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-950",
            )}
            type="button"
            onClick={model.toggleCommitPicker}
            aria-expanded={model.isCommitPickerOpen}
            aria-haspopup="listbox"
            disabled={!model.branchRef}
          >
            <span className="min-w-0 truncate font-mono">
              {commitsModel.buttonLabel}
            </span>
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

      <Popup.Panel
        ariaLabel="Коммиты"
        className="left-0 w-[min(420px,calc(100vw-2.5rem))] p-1"
      >
        {commitsModel.isLoading && commitsModel.commits.length === 0 && (
          <p className="px-3 py-2 text-sm text-slate-500">Загружаем коммиты...</p>
        )}

        {commitsModel.errorMessage &&
          !commitsModel.isLoading &&
          commitsModel.commits.length === 0 && (
            <p className="px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
              {commitsModel.errorMessage}
            </p>
          )}

        {!commitsModel.isLoading &&
          !commitsModel.errorMessage &&
          commitsModel.commits.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-500">Коммиты не найдены.</p>
          )}

        {commitsModel.commits.length > 0 && (
          <CommitsVirtualList
            commitsModel={commitsModel}
            onSelect={(commit) => {
              commitsModel.selectCommit(commit);
              model.closeCommitPicker();
            }}
          />
        )}
      </Popup.Panel>
    </Popup>
  );
});
