import { ArrowUpRightFromSquare } from "@gravity-ui/icons";
import { observer } from "mobx-react-lite";
import { releasesUrl } from "@/shared/lib/app-update/github-release";
import type { AppUpdateStatus } from "@/shared/lib/app-update/types";
import type { AppUpdates } from "../model/app-updates";

const updateActions: Partial<Record<AppUpdateStatus, string>> = {
  checking: "Проверяем…",
  available: "Скачать обновление",
  downloading: "Скачиваем…",
  ready: "Установить и перезапустить",
  installing: "Устанавливаем…",
};

export const AppUpdatePanel = observer(({ model }: { model: AppUpdates }) => {
  const { status, version, nextVersion, progress, message } = model.state;
  const statusText = message ?? {
    idle: "Проверьте, вышла ли новая версия GitHome.",
    checking: "Проверяем GitHub Releases.",
    available: "Обновление готово к скачиванию.",
    downloading: `Скачиваем обновление · ${progress ?? 0}%`,
    ready: "Обновление скачано и готово к установке.",
    installing: "Завершаем установку обновления.",
    current: "Установлена последняя версия.",
    manual: "",
    error: "",
  }[status];

  return (
    <section aria-labelledby="settings-updates">
      <h3 id="settings-updates" className="text-lg font-semibold">Обновления GitHome</h3>
      <p className="mt-1 mb-5 text-sm text-fg-muted">Последняя стабильная версия с GitHub Releases.</p>

      <div className="glass-panel rounded-xl p-4 sm:p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-fg-muted">Установленная версия</dt>
            <dd className="mt-1 font-mono font-semibold">{version}</dd>
          </div>
          {nextVersion && (
            <div>
              <dt className="text-fg-muted">Новая версия</dt>
              <dd className="mt-1 font-mono font-semibold">{nextVersion}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4 border-t border-border-default pt-4">
          <p role="status" className={status === "error" ? "text-sm text-red-700 dark:text-red-300" : "text-sm text-fg-muted"}>
            {statusText}
          </p>

          {status === "downloading" && (
            <progress
              aria-label="Загрузка обновления"
              className="mt-3 h-2 w-full accent-orange-600"
              max={100}
              value={progress ?? 0}
            />
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <button
              type="button"
              disabled={model.isBusy}
              onClick={() => void model.perform()}
              className="glass-primary rounded-lg px-3.5 py-2 text-sm font-semibold"
            >
              {model.isAndroid && status === "ready" ? "Установить обновление"
                : updateActions[status] ?? "Проверить обновления"}
            </button>
            <a
              href={releasesUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-link hover:underline"
            >
              Релизы на GitHub
              <ArrowUpRightFromSquare className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
});
