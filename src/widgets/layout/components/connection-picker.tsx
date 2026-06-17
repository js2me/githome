import { observer } from "mobx-react-lite";
import { useEffect, useRef } from "react";
import { useViewModel } from "mobx-view-model-react";
import { getConnectionLabel } from "@/shared/lib/gitlab/connection";
import { cn } from "@/shared/lib/cn";
import { LayoutVM } from "../model/layout-vm";

const inputClassName =
  "w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-focus-shadow)] dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200";

const buttonClassName =
  "rounded-[10px] px-3.5 py-2.5 text-sm font-semibold transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45";

const navLinkClassName =
  "cursor-pointer rounded-lg border-none bg-transparent px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200";

export const ConnectionPicker = observer(() => {
  const model = useViewModel(LayoutVM);
  const settings = model.globals.stores.settings;
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const buttonLabel = settings.activeItem
    ? getConnectionLabel(settings.activeItem)
    : "Новая связка";

  useEffect(() => {
    if (!model.isConnectionPopupOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        popupRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }

      model.closeConnectionPopup();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        model.closeConnectionPopup();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [model, model.isConnectionPopupOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        className={cn(
          navLinkClassName,
          model.isConnectionPopupOpen &&
            "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200",
        )}
        type="button"
        aria-expanded={model.isConnectionPopupOpen}
        aria-haspopup="dialog"
        onClick={model.toggleConnectionPopup}
      >
        {buttonLabel}
      </button>

      {model.isConnectionPopupOpen && (
        <div
          ref={popupRef}
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-[min(420px,calc(100vw-2.5rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-gray-900"
          role="dialog"
          aria-label="Связки GitLab"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Связки
          </p>

          <ul className="mb-4 max-h-48 overflow-y-auto rounded-[10px] border border-slate-200 dark:border-slate-700">
            <li>
              <button
                className={cn(
                  "flex w-full items-center border-none bg-transparent px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800",
                  !settings.activeId &&
                    "bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300",
                )}
                type="button"
                onClick={model.selectNewConnection}
              >
                Новая связка
              </button>
            </li>
            {settings.connectionOptions.map((option) => (
              <li key={option.id}>
                <button
                  className={cn(
                    "flex w-full items-center border-none bg-transparent px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800",
                    settings.activeId === option.id &&
                      "bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300",
                  )}
                  type="button"
                  onClick={() => model.selectConnection(option.id)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500">
                GitLab URL
              </span>
              <input
                className={inputClassName}
                type="url"
                placeholder="https://gitlab.com"
                value={model.draftGitlabUrl}
                onChange={(event) => model.setDraftGitlabUrl(event.target.value)}
                autoComplete="off"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500">
                Git Token
              </span>
              <input
                className={inputClassName}
                type="password"
                placeholder="glpat-..."
                value={model.draftGitToken}
                onChange={(event) => model.setDraftGitToken(event.target.value)}
                autoComplete="off"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className={cn(buttonClassName, "border-none bg-brand text-white")}
              type="button"
              disabled={!model.canAdd}
              onClick={model.addConnection}
            >
              Добавить
            </button>
            <button
              className={cn(
                buttonClassName,
                "border-none bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200",
              )}
              type="button"
              disabled={!model.canSave}
              onClick={model.saveConnection}
            >
              Сохранить
            </button>
            <button
              className={cn(
                buttonClassName,
                "border-none bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
              )}
              type="button"
              disabled={!model.canRemove}
              onClick={model.removeConnection}
            >
              Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
