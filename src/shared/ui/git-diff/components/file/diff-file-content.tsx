import { observer } from 'mobx-react-lite';
import type { CSSProperties } from 'react';
import {
  codeFontSizeKey,
  wrapSourceCodeKey,
} from '@/shared/lib/code-view-preferences';
import { t } from '@/shared/lib/i18n';
import type { FileGitDiff } from '../../model/file-git-diff';
import { DiffSyntaxHighlightProvider } from '../diff-syntax-highlight';
import { DiffImages } from '../images/diff-images';
import { DiffBody } from '../virtual-diff-body';
import { DiffFileCollapseBanner } from './diff-file-collapse-banner';

export const DiffFileContent = observer(({ model }: { model: FileGitDiff }) => {
  const { meta, content, rows, images } = model;
  const {
    change,
    isDiffContentHidden,
    isLazyCollapsed,
    reservedBodyMinHeight,
  } = meta;
  const {
    isContentCollapsed,
    collapsedExpandError,
    isLoadingCollapsedExpand,
    isResolvingDiff,
    parsed,
    showTooLargeBanner,
  } = content;
  const { virtualRows } = rows;

  if (isContentCollapsed) return null;
  if (images) return <DiffImages images={images} />;

  const renderDiffContent = () => {
    if (showTooLargeBanner) {
      return (
        <DiffFileCollapseBanner
          change={change}
          isLoading={false}
          onExpand={() => undefined}
        />
      );
    }

    if (isDiffContentHidden) {
      return (
        <DiffFileCollapseBanner
          change={change}
          isLoading={isLoadingCollapsedExpand}
          onExpand={() => {
            void content.expandCollapsedFile();
          }}
        />
      );
    }

    if (parsed && virtualRows.length > 0) {
      return (
        <DiffSyntaxHighlightProvider highlighting={model.highlighting}>
          <DiffBody fileGitDiff={model} />
        </DiffSyntaxHighlightProvider>
      );
    }

    if (isLazyCollapsed && !parsed) {
      return (
        <div className="flex items-center gap-3 p-3.5 text-[13px] text-slate-500">
          <span>
            {collapsedExpandError
              ? t('diff.couldNotLoadDiff', { v1: collapsedExpandError })
              : t('diff.loadingDiff')}
          </span>
          {collapsedExpandError && (
            <button
              type="button"
              className="cursor-pointer rounded border border-slate-300 px-2 py-1 font-medium text-slate-700 text-xs hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              disabled={isLoadingCollapsedExpand}
              onClick={() => void content.expandCollapsedFile()}
            >
              {t('common.retry')}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="p-3.5 text-[13px] text-slate-500">
        {isResolvingDiff || isLoadingCollapsedExpand
          ? t('diff.loadingDiff')
          : t('diff.noDiffForThisFile')}
      </div>
    );
  };

  return (
    <div
      className="git-diff-body-scroll"
      data-wrap-code={wrapSourceCodeKey.value ? '' : undefined}
      style={
        {
          '--diff-code-font-size': `${codeFontSizeKey.value}px`,
        } as CSSProperties
      }
    >
      <div
        className="git-diff-body-inner"
        data-diff-notice={
          showTooLargeBanner || isDiffContentHidden ? '' : undefined
        }
        style={
          reservedBodyMinHeight
            ? { minHeight: reservedBodyMinHeight }
            : undefined
        }
      >
        {renderDiffContent()}
      </div>
    </div>
  );
});
