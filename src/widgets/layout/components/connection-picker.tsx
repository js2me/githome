import { Check, ChevronDown, LogoGitlab, Plus, Xmark } from "@gravity-ui/icons";
import { observer } from "mobx-react-lite";
import { useViewModel } from "mobx-view-model-react";
import { getConnectionLabel } from "@/shared/lib/gitlab/connection";
import { GlassDialog } from "@/shared/ui/glass-dialog";
import { LayoutVM } from "../model/layout-vm";

export const ConnectionPicker = observer(() => {
  const model = useViewModel<LayoutVM>();
  const settings = model.globals.stores.settings;
  const label = settings.activeItem ? getConnectionLabel(settings.activeItem) : "Подключить GitLab";

  return (
    <>
      <button
        type="button"
        className="glass-control inline-flex h-9 min-w-0 items-center gap-2 rounded-xl px-2.5 text-sm font-semibold sm:px-3"
        aria-label={`Подключения GitLab · ${label}`}
        title={label}
        aria-haspopup="dialog"
        onClick={model.openConnectionPopup}
      >
        <LogoGitlab className="size-4 shrink-0 text-[var(--glass-accent)]" aria-hidden />
        <span className="hidden max-w-40 truncate min-[480px]:inline">{label}</span>
        <ChevronDown className="hidden size-3 shrink-0 min-[480px]:block" aria-hidden />
      </button>
      <GlassDialog
        ref={model.connectionDialog}
        aria-labelledby="connections-title"
        className="max-h-[calc(100dvh-2rem)] w-[min(27rem,calc(100%-2rem))] overflow-y-auto p-5 sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="connections-title" className="text-xl font-bold tracking-tight">Подключения GitLab</h2>
          <button type="button" className="glass-control grid size-8 place-items-center rounded-lg" aria-label="Закрыть подключения" onClick={model.closeConnectionPopup}>
            <Xmark className="size-4" aria-hidden />
          </button>
        </div>
        {settings.connections.length > 0 && (
          <div className="mb-5 flex max-h-44 flex-col gap-1 overflow-y-auto border-b border-[var(--glass-border)] pb-4">
            {settings.connectionOptions.map((option) => (
              <button
                key={option.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--glass-hover)] aria-pressed:bg-[var(--glass-selected)]"
                type="button"
                aria-pressed={model.draftConnectionId === option.id}
                onClick={() => model.selectConnection(option.id)}
              >
                <LogoGitlab className="size-4 shrink-0" aria-hidden />
                <span className="flex-1 truncate">{option.label}</span>
                {model.draftConnectionId === option.id && <Check className="size-4 text-[var(--glass-accent)]" aria-hidden />}
              </button>
            ))}
            <button type="button" aria-pressed={!model.draftConnectionId} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--glass-accent)] hover:bg-[var(--glass-hover)] aria-pressed:bg-[var(--glass-selected)]" onClick={model.selectNewConnection}>
              <Plus className="size-4" aria-hidden /> Новое подключение
            </button>
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            model.saveConnection();
          }}
        >
          <label className="mb-4 grid gap-1.5 text-sm font-semibold">
            Адрес GitLab
            <input
              ref={model.connectionUrlInput}
              className="glass-input min-w-0 rounded-xl px-3.5 py-2.5 font-normal"
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://gitlab.com"
              value={model.draftGitlabUrl}
              onChange={(event) => model.setDraftGitlabUrl(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            Токен доступа
            <input
              className="glass-input min-w-0 rounded-xl px-3.5 py-2.5 font-normal"
              type="password"
              autoComplete="off"
              placeholder="glpat-…"
              value={model.draftGitToken}
              onChange={(event) => model.setDraftGitToken(event.target.value)}
            />
          </label>
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            {model.draftConnectionId && <button className="glass-control mr-auto rounded-xl px-3 py-2 text-sm text-red-700 dark:text-red-300" type="button" onClick={model.removeConnection}>Удалить</button>}
            <button className="glass-primary rounded-xl px-4 py-2 text-sm font-semibold" type="submit" disabled={!model.canSubmitConnection}>
              {model.draftConnectionId ? "Сохранить" : "Подключить"}
            </button>
          </div>
        </form>
      </GlassDialog>
    </>
  );
});
