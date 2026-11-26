import { Display, Moon, Sun } from '@gravity-ui/icons';
import {
  actionBound,
  computed,
  observable,
  observableRef,
  reaction,
  runInAction,
} from 'mobx';
import { createRef } from 'yummies/mobx';
import {
  type CodeColorMode,
  type CodeFontSize,
  codeFontSizeKey,
  codeSyntaxThemeSettings,
  getCodeSyntaxTheme,
  wrapSourceCodeKey,
} from '@/shared/lib/code-view-preferences';
import type { MessageKey } from '@/shared/lib/i18n';
import type { SystemLinksState } from '@/shared/lib/system-links/types';
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

  private readonly desktopLinks = window.githomeDesktop?.systemLinks;
  @observableRef accessor systemLinks: SystemLinksState | undefined;
  @observable accessor systemLinksBusy = false;
  @observable accessor systemLinksError = false;

  private get gitlabUrls() {
    return this.globals.stores.settings.connections.map(
      ({ gitlabUrl }) => gitlabUrl,
    );
  }

  @computed
  get hasGitlabConnections() {
    return this.globals.stores.settings.connections.length > 0;
  }

  connectSystemLinks(signal: AbortSignal) {
    const desktop = this.desktopLinks;
    if (!desktop) return;
    const dispose = reaction(
      () => this.gitlabUrls,
      (urls) => void desktop.syncGitlabs(urls).catch(() => undefined),
      { fireImmediately: true },
    );
    signal.addEventListener('abort', dispose, { once: true });
  }

  @actionBound
  async refreshSystemLinks() {
    if (!this.desktopLinks || this.systemLinksBusy) return;
    try {
      const state = await this.desktopLinks.getState();
      if (!this.systemLinksBusy)
        runInAction(() => {
          this.systemLinks = state;
        });
    } catch {
      runInAction(() => {
        this.systemLinksError = true;
      });
    }
  }

  @actionBound
  async toggleSystemLinks() {
    if (
      !this.desktopLinks ||
      !this.systemLinks?.available ||
      this.systemLinksBusy
    )
      return;
    const enabled = !this.systemLinks.enabled;
    this.systemLinksBusy = true;
    this.systemLinksError = false;
    try {
      if (enabled) await this.desktopLinks.syncGitlabs(this.gitlabUrls);
      const state = await this.desktopLinks.setEnabled(enabled);
      runInAction(() => {
        this.systemLinks = state;
      });
    } catch {
      runInAction(() => {
        this.systemLinksError = true;
      });
    } finally {
      runInAction(() => {
        this.systemLinksBusy = false;
      });
    }
    if (this.systemLinksError) await this.refreshSystemLinks();
  }

  readonly updates = new AppUpdates();
  readonly themeOptions: {
    id: ThemePreference;
    labelKey: MessageKey;
    Icon: typeof Sun;
  }[] = [
    { id: 'light', labelKey: 'settings.light', Icon: Sun },
    { id: 'system', labelKey: 'settings.system', Icon: Display },
    { id: 'dark', labelKey: 'settings.dark', Icon: Moon },
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
