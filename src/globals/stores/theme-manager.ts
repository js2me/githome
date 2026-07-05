import { action, computed, reaction } from "mobx";
import { colorScheme } from "mobx-web-api";
import { appStorage } from "@/shared/lib/storage";

export type ThemePreference = "light" | "dark" | "system";

const themePreferenceKey = appStorage.key<ThemePreference>("theme", "system");

export class ThemeManager {
  constructor() {
    reaction(
      () => [this.preference, colorScheme.scheme] as const,
      () => this.syncDom(),
      { fireImmediately: true },
    );
  }

  @computed
  get preference(): ThemePreference {
    return themePreferenceKey.value;
  }

  @computed
  get isDark(): boolean {
    if (this.preference === "dark") {
      return true;
    }

    if (this.preference === "light") {
      return false;
    }

    return colorScheme.isDark;
  }

  @action
  setPreference(preference: ThemePreference) {
    themePreferenceKey.value = preference;
  }

  private syncDom() {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.classList.toggle("dark", this.isDark);
    root.style.colorScheme = this.isDark ? "dark" : "light";
  }
}
