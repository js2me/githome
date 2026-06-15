import { observer } from "mobx-react-lite";
import { useViewModel } from "mobx-view-model-react";
import { cn } from "@/shared/lib/cn";
import { LayoutVM } from "../model/layout-vm";

const inputClassName =
  "w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-[#fc6d26] focus:shadow-[0_0_0_3px_rgba(252,109,38,0.15)] dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200";

const buttonClassName =
  "rounded-[10px] px-3.5 py-2.5 text-sm font-semibold transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45";

export const Header = observer(() => {
  const model = useViewModel(LayoutVM);
  const settings = model.globals.stores.settings;

  return (
    <header className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-gray-900">
      <div className="mr-auto flex min-w-[140px] items-center gap-2.5">
        <div
          className="grid h-9 w-9 place-items-center rounded-[10px] bg-gradient-to-br from-[#fc6d26] to-[#e24329] text-sm font-bold text-white"
          aria-hidden
        >
          GH
        </div>
        <h1 className="m-0 text-lg font-bold tracking-tight">GitHome</h1>
      </div>

      <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-500">Связка</span>
        <select
          className={cn(inputClassName, "cursor-pointer")}
          value={settings.activeId ?? ""}
          onChange={(event) => model.selectConnection(event.target.value)}
        >
          <option value="">Новая связка</option>
          {settings.connectionOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-[280px] flex-[2] flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-500">GitLab URL</span>
        <input
          className={inputClassName}
          type="url"
          placeholder="https://gitlab.com"
          value={model.draftGitlabUrl}
          onChange={(event) => model.setDraftGitlabUrl(event.target.value)}
          autoComplete="off"
        />
      </label>

      <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-500">Git Token</span>
        <input
          className={inputClassName}
          type="password"
          placeholder="glpat-..."
          value={model.draftGitToken}
          onChange={(event) => model.setDraftGitToken(event.target.value)}
          autoComplete="off"
        />
      </label>

      <div className="flex flex-wrap items-end gap-2">
        <button
          className={cn(buttonClassName, "border-none bg-[#fc6d26] text-white")}
          type="button"
          disabled={!model.canAdd}
          onClick={() => model.addConnection()}
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
          onClick={() => model.saveConnection()}
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
          onClick={() => model.removeConnection()}
        >
          Удалить
        </button>
      </div>
    </header>
  );
});
