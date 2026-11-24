import { Code, Gear, Palette, Xmark, CircleArrowDown } from "@gravity-ui/icons";
import { observer } from "mobx-react-lite";
import { useViewModel } from "mobx-view-model-react";
import { useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { codeFontSizes } from "@/shared/lib/code-view-preferences";
import { LayoutVM } from "../model/layout-vm";
import { AppUpdatePanel } from "./app-update-panel";

const sections = [
  { id: "appearance", label: "Оформление", Icon: Palette },
  { id: "code", label: "Просмотр кода", Icon: Code },
  { id: "updates", label: "Обновления", Icon: CircleArrowDown },
] as const;

const iconButtonClassName =
  "grid size-9 shrink-0 place-items-center rounded-lg text-fg-muted transition hover:bg-slate-100 hover:text-fg-default dark:hover:bg-slate-800";

export const SettingsDialog = observer(() => {
  const { appSettings } = useViewModel<LayoutVM>();
  const dialog = useRef<HTMLDialogElement>(null);
  const [section, setSection] = useState<typeof sections[number]["id"]>("appearance");

  return (
    <>
      <button
        type="button"
        className={iconButtonClassName}
        aria-label="Настройки"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <Gear className="size-[18px]" aria-hidden />
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="settings-title"
        className="fixed inset-0 m-auto h-[35rem] max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[50rem] overflow-hidden rounded-2xl border border-border-default bg-canvas-overlay p-0 text-fg-default shadow-2xl backdrop:bg-slate-950/55 sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)]"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border-default px-4 py-4 sm:px-6">
            <h2 id="settings-title" className="text-xl font-bold tracking-tight">Настройки</h2>
            <button
              type="button"
              className={iconButtonClassName}
              aria-label="Закрыть настройки"
              onClick={() => dialog.current?.close()}
            >
              <Xmark className="size-[18px]" aria-hidden />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <nav
              aria-label="Разделы настроек"
              className="grid shrink-0 grid-cols-3 gap-1 border-b border-border-default bg-canvas-subtle p-2 sm:flex sm:w-48 sm:flex-col sm:border-r sm:border-b-0 sm:p-3"
            >
              {sections.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-current={section === id ? "true" : undefined}
                  className={cn(
                    "flex min-w-0 items-center justify-center gap-2 rounded-lg px-1 py-2 text-xs font-semibold transition sm:justify-start sm:px-3 sm:text-sm",
                    section === id
                      ? "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                      : "text-fg-muted hover:bg-slate-100 hover:text-fg-default dark:hover:bg-slate-800",
                  )}
                  onClick={() => setSection(id)}
                >
                  <Icon className="hidden size-4 shrink-0 min-[400px]:block" aria-hidden />
                  {label}
                </button>
              ))}
            </nav>

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-7">
              {section === "appearance" && (
                <section aria-labelledby="settings-appearance">
                  <h3 id="settings-appearance" className="text-lg font-semibold">Тема интерфейса</h3>
                  <p className="mt-1 mb-5 text-sm text-fg-muted">Меняет оформление приложения и подсветку кода.</p>
                  <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Тема">
                    {appSettings.themeOptions.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={appSettings.activeTheme === id}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold sm:flex-col sm:items-start sm:py-4",
                          appSettings.activeTheme === id
                            ? "border-orange-600 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-300"
                            : "border-border-default hover:bg-canvas-subtle",
                        )}
                        onClick={() => appSettings.setThemePreference(id)}
                      >
                        <Icon className="size-5 shrink-0" aria-hidden />
                        {label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {section === "code" && (
                <section aria-labelledby="settings-code">
                  <h3 id="settings-code" className="text-lg font-semibold">Просмотр кода</h3>
                  <p className="mt-1 mb-5 text-sm text-fg-muted">Эти параметры применяются к файлам в репозитории.</p>
                  <div className="divide-y divide-border-default rounded-xl border border-border-default">
                    <label className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm font-semibold">
                      Размер шрифта
                      <select
                        className="rounded-lg border border-border-default bg-canvas-default px-2.5 py-1.5 text-sm"
                        value={appSettings.codeFontSize}
                        onChange={(event) => {
                          const size = codeFontSizes.find((option) => String(option) === event.target.value);
                          if (size) appSettings.setCodeFontSize(size);
                        }}
                      >
                        {codeFontSizes.map((size) => <option key={size} value={size}>{size} px</option>)}
                      </select>
                    </label>
                    <label className="flex items-center justify-between gap-3 px-4 py-4">
                      <span>
                        <span className="block text-sm font-semibold">Перенос длинных строк</span>
                        <span className="mt-1 block text-sm text-fg-muted">Показывает длинные строки целиком без горизонтальной прокрутки.</span>
                      </span>
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 accent-orange-600"
                        checked={appSettings.wrapSourceCode}
                        onChange={(event) => appSettings.setWrapSourceCode(event.target.checked)}
                      />
                    </label>
                  </div>
                </section>
              )}

              {section === "updates" && <AppUpdatePanel model={appSettings.updates} />}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
});
