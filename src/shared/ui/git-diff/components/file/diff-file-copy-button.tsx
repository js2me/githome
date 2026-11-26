import { withPropsViewModel } from 'mobx-view-model-react';
import { cva } from 'yummies/css';
import { t } from '@/shared/lib/i18n';
import { DiffFileCopyVM } from '../../model/copy-file';
import { CopiedIcon } from '../icons/copied-icon';
import { CopyFailedIcon } from '../icons/copy-failed-icon';

const diffFileCopyButtonVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-md enabled:cursor-pointer enabled:hover:bg-brand-tint enabled:hover:text-brand-ink',
  {
    variants: {
      compact: {
        true: 'size-5 text-fg-muted [&_svg]:size-3.5',
        false:
          'size-7 border border-border-default bg-canvas-subtle text-fg-default',
      },
    },
    defaultVariants: {
      compact: false,
    },
  },
);

export const DiffFileCopyButton = withPropsViewModel(
  DiffFileCopyVM,
  ({ model }) => {
    const {
      payload: { label, compact, icon },
      clipboard: { status },
      copy: handleCopy,
    } = model;
    return (
      <button
        className={diffFileCopyButtonVariants({ compact })}
        type="button"
        title={
          status === 'copied'
            ? t('review.copied')
            : status === 'failed'
              ? t('review.couldNotCopy')
              : label
        }
        aria-label={label}
        disabled={status === 'copied'}
        onClick={() => {
          void handleCopy();
        }}
      >
        {status === 'copied' ? (
          <CopiedIcon />
        ) : status === 'failed' ? (
          <CopyFailedIcon />
        ) : (
          icon
        )}
      </button>
    );
  },
);
