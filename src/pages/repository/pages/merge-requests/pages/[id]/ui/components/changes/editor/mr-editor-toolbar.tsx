import {
  ArrowUpRightFromSquare,
  ChevronLeft,
  Magnifier,
  Sliders,
} from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { useContext } from 'react';
import {
  codeFontSizeKey,
  codeFontSizes,
  wrapSourceCodeKey,
} from '@/shared/lib/code-view-preferences';
import { t } from '@/shared/lib/i18n';
import { DiffSearchContext } from '@/shared/ui/git-diff/components/diff-search/diff-search-context';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';
import { MrProjectPath } from '../../navigation/mr-project-path';
import { MrLifecycleActions } from '../../overview/lifecycle/mr-lifecycle-actions';

export const MrEditorToolbar = observer(
  ({
    model,
    zen,
    onToggleZen,
  }: {
    model: MergeRequestDetailVM;
    zen: boolean;
    onToggleZen: () => void;
  }) => {
    const search = useContext(DiffSearchContext);
    const mr = model.parentViewModel.mrInfo.detailView?.mergeRequest;
    if (!mr) return null;

    return (
      <header
        className="mr-editor-toolbar"
        aria-label={t('review.mergeRequestSummary')}
      >
        <button
          type="button"
          className="mr-editor-back"
          onClick={model.showOverview}
        >
          <ChevronLeft className="size-4 shrink-0" aria-hidden />
          {t('workbench.overview')}
        </button>
        <div className="mr-editor-heading">
          <MrProjectPath model={model} className="mr-editor-project" />
          <h1 title={mr.title}>
            <span className="font-mono text-brand">!{mr.iid}</span>
            <span className="min-w-0 truncate">{mr.title}</span>
          </h1>
        </div>
        <div className="mr-editor-actions">
          <button
            type="button"
            className="mr-editor-icon"
            title={t('workbench.searchCode')}
            aria-label={t('workbench.searchCode')}
            onClick={() => search?.open()}
          >
            <Magnifier className="size-4" aria-hidden />
          </button>
          <details
            className="mr-editor-options"
            onKeyDown={(event) => {
              if (event.key !== 'Escape' || !event.currentTarget.open) return;
              event.currentTarget.open = false;
              event.currentTarget.querySelector('summary')?.focus();
            }}
          >
            <summary
              className="mr-editor-icon"
              title={t('workbench.displayOptions')}
              aria-label={t('workbench.displayOptions')}
            >
              <Sliders className="size-4" aria-hidden />
            </summary>
            <div className="glass-overlay mr-editor-settings">
              <label className="mr-editor-zen">
                <input type="checkbox" checked={zen} onChange={onToggleZen} />
                {t('workbench.zenMode')}
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={wrapSourceCodeKey.value}
                  onChange={(event) => {
                    wrapSourceCodeKey.value = event.target.checked;
                  }}
                />
                {t('settings.wrapLongLines')}
              </label>
              <label>
                {t('settings.fontSize')}
                <select
                  className="glass-control rounded px-1"
                  value={codeFontSizeKey.value}
                  onChange={(event) => {
                    const size = codeFontSizes.find(
                      (option) => String(option) === event.target.value,
                    );
                    if (size) codeFontSizeKey.value = size;
                  }}
                >
                  {codeFontSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}px
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>
          <a
            className="mr-editor-external mr-editor-icon"
            href={mr.web_url}
            target="_blank"
            rel="noreferrer"
            aria-label={t('common.openInGitLab')}
            title={t('common.openInGitLab')}
          >
            <ArrowUpRightFromSquare className="size-4" aria-hidden />
          </a>
          <div className="mr-editor-lifecycle">
            <MrLifecycleActions key={mr.web_url} model={model} />
          </div>
        </div>
      </header>
    );
  },
);
