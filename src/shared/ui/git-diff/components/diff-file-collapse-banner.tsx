import { ChevronDown } from '@gravity-ui/icons';
import { memo } from 'react';
import type { GitLabMergeRequestChangeDC } from '@/shared/api/gitlab';

const GENERATED_DOCS_URL =
  'https://docs.gitlab.com/ee/user/project/merge_requests/changes.html#collapse-generated-files';

const bannerClassName =
  'flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-info-border border-b bg-info-surface px-4 py-3 text-fg-default text-sm';

export const DiffFileCollapseBanner = memo(
  ({
    change,
    isLoading,
    onExpand,
  }: {
    change: GitLabMergeRequestChangeDC;
    isLoading: boolean;
    onExpand: () => void;
  }) => {
    if (change.too_large) {
      return (
        <div className={bannerClassName}>
          <p className="m-0">
            Diff слишком большой для отображения в этом интерфейсе.
          </p>
        </div>
      );
    }

    const message = change.generated_file ? (
      <>
        Сгенерированные файлы по умолчанию свёрнуты. Чтобы изменить это
        поведение, отредактируйте файл{' '}
        <code className="rounded bg-canvas-subtle px-1 py-0.5 font-mono text-[13px]">
          .gitattributes
        </code>
        .{' '}
        <a
          className="text-fg-link hover:underline"
          href={GENERATED_DOCS_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          Подробнее
        </a>
        .
      </>
    ) : (
      <>
        Diff для этого файла свёрнут. Разверните его, чтобы увидеть изменения.
      </>
    );

    return (
      <div className={bannerClassName}>
        <p className="m-0">{message}</p>
        <button
          className="glass-control inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 font-semibold text-xs disabled:cursor-wait"
          type="button"
          aria-busy={isLoading}
          disabled={isLoading}
          onClick={onExpand}
        >
          {isLoading ? (
            <span
              aria-hidden="true"
              className="size-3.5 rounded-full border border-current border-t-transparent motion-safe:animate-spin"
            />
          ) : (
            <ChevronDown aria-hidden="true" className="size-3.5" />
          )}
          {isLoading ? 'Загружаем…' : 'Развернуть файл'}
        </button>
      </div>
    );
  },
);
