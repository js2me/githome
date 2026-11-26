import { CircleArrowDown, Code, Gear, Palette, Xmark } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { useViewModel } from 'mobx-view-model-react';
import { cn } from '@/shared/lib/cn';
import {
  codeFontSizes,
  codeSyntaxThemeSettings,
} from '@/shared/lib/code-view-preferences';
import { getLanguage, languages, setLanguage, t } from '@/shared/lib/i18n';
import { GlassDialog } from '@/shared/ui/glass-dialog';
import type { LayoutVM } from '../model/layout-vm';
import { AppUpdatePanel } from './app-update-panel';

const sections = [
  {
    id: 'appearance',
    labelKey: 'settings.appearance',
    Icon: Palette,
  },
  {
    id: 'code',
    labelKey: 'settings.codeView',
    Icon: Code,
  },
  {
    id: 'updates',
    labelKey: 'settings.updates',
    Icon: CircleArrowDown,
  },
] as const;

const codeColorModes = [
  {
    mode: 'light',
    labelKey: 'settings.colorSchemeForLightTheme',
  },
  {
    mode: 'dark',
    labelKey: 'settings.colorSchemeForDarkTheme',
  },
] as const;

const iconButtonClassName =
  'glass-control grid size-9 shrink-0 place-items-center rounded-xl text-fg-muted';

export const SettingsDialog = observer(() => {
  const { appSettings } = useViewModel<LayoutVM>();
  const { dialog, section, setSection } = appSettings;

  return (
    <>
      <button
        type="button"
        className={iconButtonClassName}
        aria-label={t('settings.title')}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <Gear className="size-[18px]" aria-hidden />
      </button>

      <GlassDialog
        ref={dialog}
        aria-labelledby="settings-title"
        className="h-[35rem] max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[50rem] overflow-hidden p-0 sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)]"
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-4 border-border-default border-b px-4 py-4 sm:px-6">
            <h2
              id="settings-title"
              className="font-bold text-xl tracking-tight"
            >
              {t('settings.title')}
            </h2>
            <button
              type="button"
              className={iconButtonClassName}
              aria-label={t('settings.closeSettings')}
              onClick={() => dialog.current?.close()}
            >
              <Xmark className="size-[18px]" aria-hidden />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <nav
              aria-label={t('settings.settingsSections')}
              className="grid shrink-0 grid-cols-3 gap-1 border-border-default border-b bg-[var(--glass-control)] p-2 sm:flex sm:w-48 sm:flex-col sm:border-r sm:border-b-0 sm:p-3"
            >
              {sections.map(({ id, labelKey, Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-current={section === id ? 'true' : undefined}
                  className={cn(
                    'flex min-w-0 items-center justify-center gap-2 rounded-lg px-1 py-2 font-semibold text-xs transition sm:justify-start sm:px-3 sm:text-sm',
                    section === id
                      ? 'bg-[var(--glass-selected)] text-[var(--glass-accent)]'
                      : 'text-fg-muted hover:bg-[var(--glass-hover)] hover:text-fg-default',
                  )}
                  onClick={() => setSection(id)}
                >
                  <Icon
                    className="hidden size-4 shrink-0 min-[400px]:block"
                    aria-hidden
                  />
                  {t(labelKey)}
                </button>
              ))}
            </nav>

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-7">
              {section === 'appearance' && (
                <section aria-labelledby="settings-appearance">
                  <label className="glass-panel mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 font-semibold text-sm">
                    {t('settings.language')}
                    <select
                      className="glass-input rounded-lg px-2.5 py-1.5 text-sm"
                      value={getLanguage()}
                      onChange={(event) => setLanguage(event.target.value)}
                    >
                      {Object.entries(languages).map(([id, name]) => (
                        <option key={id} value={id} lang={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <h3
                    id="settings-appearance"
                    className="font-semibold text-lg"
                  >
                    {t('settings.interfaceTheme')}
                  </h3>
                  <p className="mt-1 mb-5 text-fg-muted text-sm">
                    {t('settings.changesTheAppearanceOfTheAppAnd')}
                  </p>
                  <div
                    className="grid gap-2 sm:grid-cols-3"
                    role="group"
                    aria-label={t('settings.theme')}
                  >
                    {appSettings.themeOptions.map(({ id, labelKey, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={appSettings.activeTheme === id}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-3 py-3 text-left font-semibold text-sm sm:flex-col sm:items-start sm:py-4',
                          appSettings.activeTheme === id
                            ? 'border-[var(--glass-accent)] bg-[var(--glass-selected)] text-[var(--glass-accent)]'
                            : 'glass-control',
                        )}
                        onClick={() => appSettings.setThemePreference(id)}
                      >
                        <Icon className="size-5 shrink-0" aria-hidden />
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {section === 'code' && (
                <section aria-labelledby="settings-code">
                  <h3 id="settings-code" className="font-semibold text-lg">
                    {t('settings.codeView')}
                  </h3>
                  <p className="mt-1 mb-5 text-fg-muted text-sm">
                    {t('settings.theseSettingsApplyToRepositoryFilesAnd')}
                  </p>
                  <div className="glass-panel divide-y divide-border-default rounded-xl">
                    <label className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 font-semibold text-sm">
                      {t('settings.fontSize')}
                      <select
                        className="glass-input rounded-lg px-2.5 py-1.5 text-sm"
                        value={appSettings.codeFontSize}
                        onChange={(event) => {
                          const size = codeFontSizes.find(
                            (option) => String(option) === event.target.value,
                          );
                          if (size) appSettings.setCodeFontSize(size);
                        }}
                      >
                        {codeFontSizes.map((size) => (
                          <option key={size} value={size}>
                            {size} px
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center justify-between gap-3 px-4 py-4">
                      <span>
                        <span className="block font-semibold text-sm">
                          {t('settings.wrapLongLines')}
                        </span>
                        <span className="mt-1 block text-fg-muted text-sm">
                          {t(
                            'settings.showsLongLinesWithoutHorizontalScrolling',
                          )}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 accent-brand"
                        checked={appSettings.wrapSourceCode}
                        onChange={(event) =>
                          appSettings.setWrapSourceCode(event.target.checked)
                        }
                      />
                    </label>
                    {codeColorModes.map(({ mode, labelKey }) => (
                      <label
                        key={mode}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 font-semibold text-sm"
                      >
                        {t(labelKey)}
                        <select
                          className="glass-input rounded-lg px-2.5 py-1.5 text-sm"
                          value={appSettings.getCodeSyntaxTheme(mode)}
                          onChange={(event) =>
                            appSettings.setCodeSyntaxTheme(
                              mode,
                              event.target.value,
                            )
                          }
                        >
                          {codeSyntaxThemeSettings[mode].options.map(
                            ({ id, label: themeLabel }) => (
                              <option key={id} value={id}>
                                {themeLabel}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {section === 'updates' && (
                <AppUpdatePanel model={appSettings.updates} />
              )}
            </div>
          </div>
        </div>
      </GlassDialog>
    </>
  );
});
