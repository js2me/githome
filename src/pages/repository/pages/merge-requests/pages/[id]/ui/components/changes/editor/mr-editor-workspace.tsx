import { observer } from 'mobx-react-lite';
import type { CSSProperties } from 'react';
import { t } from '@/shared/lib/i18n';
import { DiffSearchProvider } from '@/shared/ui/git-diff/components/diff-search';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';
import { MrChangesDiff } from '../mr-changes-diff';
import { MrCommitDiff } from './mr-commit-diff';
import { MrEditorSidebar } from './mr-editor-sidebar';
import { MrEditorToolbar } from './mr-editor-toolbar';

export const MrEditorWorkspace = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const { zen } = model;

    return (
      <div
        className="mr-editor"
        data-zen={zen}
        style={{ '--mr-editor-width': `${model.width}px` } as CSSProperties}
      >
        <DiffSearchProvider findBarVisibility="toggle">
          <MrEditorToolbar
            model={model}
            zen={zen}
            onToggleZen={model.toggleZen}
          />
          <div className="mr-editor-grid">
            {!zen && <MrEditorSidebar model={model} />}
            <section
              className="mr-editor-content"
              aria-label={t('review.changes')}
            >
              {model.commits.selectedId ? (
                <MrCommitDiff model={model} />
              ) : (
                <MrChangesDiff model={model} />
              )}
            </section>
          </div>
        </DiffSearchProvider>
      </div>
    );
  },
);
