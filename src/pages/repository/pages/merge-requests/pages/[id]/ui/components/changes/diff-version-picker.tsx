import { withPropsViewModel } from 'mobx-view-model-react';
import { cn } from '@/shared/lib/cn';
import {
  DiffVersionPickerVM,
  getVersionLabel,
} from '../../../model/changes/diff-version-picker';

export const DiffVersionPicker = withPropsViewModel(
  DiffVersionPickerVM,
  ({ model }) => {
    const { versions, selectedVersionId } = model.payload;
    const { isOpen, currentLabel } = model;

    return (
      <div ref={model.container} className="relative inline-flex">
        <button
          className={cn(
            'glass-control inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium text-xs',
            isOpen &&
              'border-[var(--glass-accent)] bg-[var(--glass-selected)] text-[var(--glass-accent)]',
          )}
          type="button"
          onClick={model.toggle}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {currentLabel}
          <svg
            aria-hidden
            className="h-3 w-3"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M4.427 6.427a.75.75 0 0 1 1.06 0L8 8.94l2.513-2.513a.75.75 0 1 1 1.06 1.06l-3.043 3.043a.75.75 0 0 1-1.06 0L4.427 7.487a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>

        {isOpen && (
          <div
            className="glass-overlay absolute top-[calc(100%+4px)] left-0 z-50 min-w-[200px] rounded-lg p-1"
            role="listbox"
          >
            {versions.map((version, index) => {
              const isSelected =
                (selectedVersionId === null && index === 0) ||
                selectedVersionId === version.id;

              return (
                <button
                  key={version.id}
                  className={cn(
                    'flex w-full items-center rounded-md px-3 py-1.5 text-left text-xs transition hover:bg-[var(--glass-hover)]',
                    isSelected &&
                      'bg-[var(--glass-selected)] font-semibold text-[var(--glass-accent)]',
                  )}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => model.select(index === 0 ? null : version.id)}
                >
                  {getVersionLabel(version, index, versions.length)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);
