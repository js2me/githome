import { withPropsViewModel } from 'mobx-view-model-react';
import { cva } from 'yummies/css';
import { DiffFileCopyVM } from '../model/copy-file';
import { CopiedIcon } from './icons/copied-icon';
import { CopyFailedIcon } from './icons/copy-failed-icon';

const diffFileCopyButtonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center rounded transition disabled:cursor-wait disabled:opacity-60',
  {
    variants: {
      compact: {
        true: 'h-5 w-5 text-[var(--color-fg-subtle)] hover:bg-[var(--color-accent-emphasis-hover)] hover:text-[var(--diff-code-text)] dark:text-[var(--color-fg-muted)] dark:hover:bg-[var(--color-canvas-muted)] [&_svg]:h-3 [&_svg]:w-3',
        false: 'glass-control size-7',
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
            ? 'Скопировано'
            : status === 'failed'
              ? 'Не удалось скопировать'
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
