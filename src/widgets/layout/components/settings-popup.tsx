import { Gear } from "@gravity-ui/icons";
import { observer } from "mobx-react-lite";
import { useViewModel } from "mobx-view-model-react";
import { cva } from "yummies/css";
import { cn } from "@/shared/lib/cn";
import { Popup } from "@/shared/ui/popup";
import { LayoutVM } from "../model/layout-vm";

const settingsTriggerButtonVariants = cva(
  "grid h-9 w-9 shrink-0 place-items-center rounded-lg border-none bg-transparent text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
  {
    variants: {
      open: {
        true: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200",
        false: "",
      },
    },
    defaultVariants: {
      open: false,
    },
  },
);

export const SettingsPopup = observer(() => {
  const model = useViewModel<LayoutVM>();
  const { appSettings } = model;

  return (
    <Popup
      isOpen={model.isSettingsPopupOpen}
      onClose={model.closeSettingsPopup}
      className="ml-auto shrink-0"
    >
      <Popup.Trigger>
        {(setTriggerRef) => (
          <button
            ref={setTriggerRef}
            className={settingsTriggerButtonVariants({
              open: model.isSettingsPopupOpen,
            })}
            type="button"
            aria-expanded={model.isSettingsPopupOpen}
            aria-haspopup="dialog"
            aria-label="Настройки"
            onClick={model.toggleSettingsPopup}
          >
            <Gear className="h-[18px] w-[18px]" aria-hidden />
          </button>
        )}
      </Popup.Trigger>

      <Popup.Panel ariaLabel="Настройки" className="right-0 w-64">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Тема
        </p>

        <div className="flex flex-col gap-1">
          {appSettings.themeOptions.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[10px] border-none bg-transparent px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800",
                appSettings.activeTheme === id &&
                  "bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300",
              )}
              type="button"
              onClick={() => appSettings.setThemePreference(id)}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </Popup.Panel>
    </Popup>
  );
});
