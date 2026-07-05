import { Display, Moon, Sun } from "@gravity-ui/icons";
import { action, computed } from "mobx";
import type { Globals } from "@/globals";
import type { ThemePreference } from "@/globals/stores/theme-manager";

export class AppSettings {
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

  @action.bound
  setThemePreference(id: ThemePreference) {
    this.globals.stores.theme.setPreference(id);
  }
}
