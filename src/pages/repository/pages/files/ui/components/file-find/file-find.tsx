import './styles.css';
import { Magnifier } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { FileFindVM } from './model';

const buttonClass =
  'glass-control shrink-0 rounded-md px-2 py-1 text-xs disabled:opacity-40';

export const FileFind = withPropsViewModel(FileFindVM, ({ model }) => {
  const label = t('files.findInFile');
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <button
        aria-expanded={model.isOpen}
        aria-label={label}
        className={buttonClass}
        onClick={model.toggle}
        ref={model.trigger}
        title={`${label} (Ctrl/⌘+F)`}
        type="button"
      >
        <Magnifier aria-hidden="true" className="size-4" />
      </button>
      {model.isOpen && (
        <>
          <input
            aria-label={label}
            className="glass-input w-36 rounded-md px-2 py-1 text-sm"
            onChange={(event) => model.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                model.close();
              } else if (event.key === 'Enter') {
                event.preventDefault();
                model.move(event.shiftKey ? -1 : 1);
              }
            }}
            placeholder={label}
            ref={model.input}
            type="search"
            value={model.query}
          />
          <output className="text-fg-muted text-xs" aria-live="polite">
            {model.payload.ready &&
              model.query.trim() &&
              (model.matchCount
                ? `${model.index + 1}/${model.matchCount}`
                : t('files.noMatchesFound'))}
          </output>
          <button
            aria-label={t('diff.previousMatchShiftEnter')}
            title={t('diff.previousMatchShiftEnter')}
            className={buttonClass}
            disabled={!model.matchCount}
            onClick={() => model.move(-1)}
            type="button"
          >
            ↑
          </button>
          <button
            aria-label={t('diff.nextMatchEnter')}
            title={t('diff.nextMatchEnter')}
            className={buttonClass}
            disabled={!model.matchCount}
            onClick={() => model.move(1)}
            type="button"
          >
            ↓
          </button>
        </>
      )}
    </div>
  );
});
