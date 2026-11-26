import { MagnifierPlus } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import type { DiffImagePreview } from '../../model/file-git-diff/content/images';

const messages = {
  get missing() {
    return t('diff.fileDoesNotExist');
  },
  get unavailable() {
    return t('diff.previewUnavailable');
  },
  get loading() {
    return t('diff.loadingImage');
  },
  get error() {
    return t('diff.couldNotLoadTheImage');
  },
};

export const ImagePanel = observer(
  ({
    label,
    preview,
    onError,
    onOpen,
  }: {
    label: string;
    preview: DiffImagePreview;
    onError: (url: string) => void;
    onOpen: (url: string, title: string) => void;
  }) => (
    <figure className="min-w-0 overflow-hidden rounded-md border border-[var(--diff-border)]">
      <figcaption className="border-[var(--diff-border)] border-b px-3 py-2 font-semibold text-sm">
        {label}
      </figcaption>
      <div className="flex h-56 items-center justify-center bg-canvas-subtle p-3 sm:h-72">
        {preview.status === 'ready' ? (
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={t('diff.openImage', { v1: label })}
            title={t('diff.openImage2')}
            className="relative flex size-full cursor-zoom-in items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-accent-blue"
            onClick={() => onOpen(preview.url, `${label} — ${preview.path}`)}
          >
            <img
              src={preview.url}
              alt={`${label} — ${preview.path}`}
              className="max-h-full max-w-full object-contain"
              decoding="async"
              onError={() => onError(preview.url)}
            />
            <span
              className="absolute right-1 bottom-1 rounded-md border border-border-default bg-canvas-overlay p-1.5 text-fg-default"
              aria-hidden
            >
              <MagnifierPlus className="size-4" />
            </span>
          </button>
        ) : (
          <span className="text-center text-fg-muted text-sm">
            {messages[preview.status]}
          </span>
        )}
      </div>
    </figure>
  ),
);
