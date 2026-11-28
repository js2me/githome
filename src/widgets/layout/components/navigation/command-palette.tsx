import {
  ArrowUturnCcwLeft,
  ChartLine,
  Code,
  CodePullRequest,
  Folder,
  House,
  Link,
  Magnifier,
  Timeline,
  Xmark,
} from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { GlassDialog } from '@/shared/ui/glass-dialog';
import { CommandPaletteVM } from '../../model/command-palette/command-palette';
import '../../ui/command-palette.css';

const icons = {
  link: Link,
  project: Folder,
  mr: CodePullRequest,
  home: House,
  files: Code,
  pipelines: Timeline,
  analytics: ChartLine,
};

export const CommandPalette = withViewModel(CommandPaletteVM, ({ model }) => (
  <>
    {model.globals.stores.settings.connections.length > 0 && (
      <button
        type="button"
        className="workbench-command"
        aria-haspopup="dialog"
        aria-label={t('palette.title')}
        aria-keyshortcuts="Control+K Meta+K"
        onClick={model.open}
      >
        <Magnifier className="size-4 shrink-0" aria-hidden />
        <span className="workbench-command-label">{t('palette.trigger')}</span>
        <span className="workbench-command-short">{t('palette.short')}</span>
        <kbd aria-hidden className="workbench-key">
          {/Mac|iPad|iPhone/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'}
        </kbd>
      </button>
    )}
    <GlassDialog
      ref={model.dialog}
      className="command-palette"
      aria-labelledby="command-palette-title"
      onClose={(event) => {
        if (!event.currentTarget.open) model.reset();
      }}
    >
      <h2 id="command-palette-title" className="sr-only">
        {t('palette.title')}
      </h2>
      <div className="palette-input-row">
        <Magnifier className="size-5 shrink-0 text-fg-muted" aria-hidden />
        <input
          ref={model.input}
          role="combobox"
          aria-label={t('palette.title')}
          aria-expanded={model.groups.length > 0}
          aria-controls="palette-results"
          aria-autocomplete="list"
          aria-activedescendant={
            model.activeOption
              ? `palette-option-${model.activeOption.id}`
              : undefined
          }
          aria-invalid={Boolean(model.error)}
          aria-describedby="palette-status"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          readOnly={model.pending}
          value={model.link}
          placeholder={t('palette.placeholder')}
          onChange={(event) => model.setLink(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              model.moveSelection(event.key === 'ArrowDown' ? 1 : -1);
            } else if (event.key === 'Enter') {
              event.preventDefault();
              model.activate();
            }
          }}
        />
        <button
          type="button"
          className="palette-close"
          aria-label={t('common.close')}
          onClick={() => model.dialog.current?.close()}
        >
          <Xmark className="size-4" aria-hidden />
        </button>
      </div>
      <div className="palette-body">
        <div
          id="palette-results"
          role="listbox"
          aria-label={t('palette.results')}
          hidden={!model.groups.length}
        >
          {model.groups.map(({ title, items }) => (
            <div
              key={title}
              role="group"
              aria-labelledby={`palette-group-${title}`}
            >
              <p className="palette-group-label" id={`palette-group-${title}`}>
                {t(title)}
              </p>
              {items.map((option) => {
                const Icon = icons[option.kind];
                const active = option.id === model.activeOption?.id;
                return (
                  <button
                    key={option.id}
                    id={`palette-option-${option.id}`}
                    role="option"
                    aria-selected={active}
                    className="palette-option"
                    type="button"
                    tabIndex={-1}
                    disabled={model.pending}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => model.activate(option)}
                  >
                    <Icon
                      className="size-4 shrink-0 text-fg-muted"
                      aria-hidden
                    />
                    <span className="palette-option-label">
                      <span className="block truncate font-medium">
                        {option.title}
                      </span>
                      {option.detail && (
                        <span className="block truncate font-mono text-fg-muted text-xs">
                          {option.detail}
                        </span>
                      )}
                    </span>
                    {active && (
                      <ArrowUturnCcwLeft
                        className="size-3.5 shrink-0 text-fg-muted"
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div id="palette-status" role="status">
          {model.error ? (
            <p className="palette-message palette-error">{model.error}</p>
          ) : model.pending || model.search.loading ? (
            <p className="palette-message">
              {t(model.pending ? 'navigation.opening' : 'common.loading')}
            </p>
          ) : model.search.error ? (
            <p className="palette-message">{t('palette.searchFailed')}</p>
          ) : !model.groups.length && model.link.trim() ? (
            <p className="palette-message">{t('palette.noResults')}</p>
          ) : null}
        </div>
      </div>
      <footer className="palette-footer">
        <span>{t('palette.hint')}</span>
        <span className="palette-keys" aria-hidden>
          ↑ ↓ <kbd>Enter</kbd> <kbd>Esc</kbd>
        </span>
      </footer>
    </GlassDialog>
  </>
));
