import { Display, Moon, Sun } from "@gravity-ui/icons";
import { actionBound, computed } from "mobx";
import type { Globals } from "@/globals";
import type { ThemePreference } from "@/globals/stores/theme-manager";
import { codeFontSizeKey, wrapSourceCodeKey, type CodeFontSize } from "@/shared/lib/code-view-preferences";
import { AppUpdates } from "./app-updates";

export class AppSettings {
  readonly updates = new AppUpdates();
  readonly themeOptions: {
    id: ThemePreference;
    label: string;
    Icon: typeof Sun;
  }[] = [
    { id: "light", label: "Светлая", Icon: Sun },
    { id: "system", label: "Системная", Icon: Display },
    { id: "dark", label: "Тёмная", Icon: Moon },
  ];

  constructor(private readonly globals: Globals) {}

  @computed
  get activeTheme() {
    return this.globals.stores.theme.preference;
  }

  @actionBound
  setThemePreference(id: ThemePreference) {
    this.globals.stores.theme.setPreference(id);
  }

  @computed
  get codeFontSize() {
    return codeFontSizeKey.value;
  }

  @computed
  get wrapSourceCode() {
    return wrapSourceCodeKey.value;
  }

  @actionBound
  setCodeFontSize(size: CodeFontSize) {
    codeFontSizeKey.value = size;
  }

  @actionBound
  setWrapSourceCode(wrap: boolean) {
    wrapSourceCodeKey.value = wrap;
  }
}
