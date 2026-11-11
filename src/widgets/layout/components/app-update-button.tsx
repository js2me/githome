import { useEffect, useState } from "react";
import type { AppUpdateState } from "@/shared/lib/app-update/types";

export function AppUpdateButton() {
  const api = window.githomeDesktop?.updates;
  const [state, setState] = useState<AppUpdateState>();

  useEffect(() => {
    if (!api) return;
    let active = true;
    let receivedEvent = false;
    const unsubscribe = api.subscribe((next) => {
      receivedEvent = true;
      if (active) setState(next);
    });
    void api.getState().then((next) => {
      if (active && !receivedEvent) setState(next);
    }).catch(() => {
      if (active) setState({ status: "error", version: "", message: "Не удалось получить состояние обновления." });
    });
    return () => { active = false; unsubscribe(); };
  }, [api]);

  if (!api) return null;
  const busy = !state || state.status === "checking" || state.status === "downloading";
  const label = state?.status === "ready" ? "Установить и перезапустить"
    : state?.status === "checking" ? "Проверяем обновления…"
    : state?.status === "downloading" ? `Скачиваем… ${state.progress ?? 0}%`
    : "Обновить";

  const update = async () => {
    try {
      if (state?.status === "ready") await api.install();
      else await api.check();
    } catch {
      setState({ status: "error", version: state?.version ?? "", message: "Не удалось обновить приложение. Попробуйте снова." });
    }
  };

  return (
    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
      <p className="mb-2 text-xs text-slate-500">GitHome {state?.version}</p>
      <button type="button" disabled={busy} onClick={() => void update()}
        className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60">
        {label}
      </button>
      <p role="status" aria-live="polite" className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {state?.status === "current" ? "У вас последняя версия."
          : state?.status === "ready" ? `Версия ${state.nextVersion} скачана. Для установки нужен перезапуск.`
          : state?.message}
      </p>
    </div>
  );
}
