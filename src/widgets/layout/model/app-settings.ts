import { Display, Moon, Sun } from '@gravity-ui/icons';
import { actionBound, computed, observable } from 'mobx';
import { createRef } from 'yummies/mobx';
import {
  type CodeColorMode,
  type CodeFontSize,
  codeFontSizeKey,
  codeSyntaxThemeSettings,
  getCodeSyntaxTheme,
  wrapSourceCodeKey,
} from '@/shared/lib/code-view-preferences';
import type { ThemePreference } from '@/shared/lib/theme/theme-manager';
import type { Globals } from '@/shared/model/globals';
import { AppUpdates } from './app-updates';

type SettingsSection = 'appearance' | 'code' | 'updates';

export class AppSettings {
  readonly dialog = createRef<HTMLDialogElement>();
  @observable accessor section: SettingsSection = 'appearance';

  @actionBound
  setSection(section: SettingsSection) {
    this.section = section;
  }

  readonly updates = new AppUpdates();
  readonly themeOptions: {
    id: ThemePreference;
    label: string;
    Icon: typeof Sun;
  }[] = [
    { id: 'light', label: 'Светлая', Icon: Sun },
    { id: 'system', label: 'Системная', Icon: Display },
    { id: 'dark', label: 'Тёмная', Icon: Moon },
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

  getCodeSyntaxTheme(mode: CodeColorMode) {
    return getCodeSyntaxTheme(mode);
  }

  @actionBound
  setCodeSyntaxTheme(mode: CodeColorMode, value: string) {
    const { key, options } = codeSyntaxThemeSettings[mode];
    if (options.some(({ id }) => id === value)) key.value = value;
  }
}
