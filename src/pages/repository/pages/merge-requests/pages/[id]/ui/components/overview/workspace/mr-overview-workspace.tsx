import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import { GitLabMarkdown } from '@/shared/ui/gitlab-markdown/gitlab-markdown';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';
import { MrEditorSidebar } from '../../changes/editor/mr-editor-sidebar';
import { MrDiscussionPanel } from '../../discussions/mr-discussion-panel';
import { MergeRequestHeader } from '../header/merge-request-header';
import { MrContextPanel } from '../metadata/mr-context-panel';
import { MrCommitList } from './mr-commit-list';
import { MrOverviewChanges } from './mr-overview-changes';

export const MrOverviewWorkspace = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const detail = model.parentViewModel.mrInfo.detailView;
    if (!detail) return null;
    const { mergeRequest } = detail;
    const description = mergeRequest.description?.trim();
    const panels = [
      { id: 'description', label: t('review.description'), count: null },
      {
        id: 'discussion',
        label: t('workbench.discussion'),
        count: mergeRequest.user_notes_count || null,
      },
      {
        id: 'commits',
        label: t('workbench.commits'),
        count:
          model.commits.query.data?.pages[0]?.total ??
          (model.commits.items.length || null),
      },
    ] as const;

    return (
      <div className="mr-overview-workspace">
        <MrEditorSidebar model={model} overview />
        <div className="mr-overview-body">
          <MergeRequestHeader model={model} />
          <div
            className="mr-overview-segments mr-segments"
            role="group"
            aria-label={t('review.mergeRequestSections')}
          >
            {panels.map(({ id, label, count }) => (
              <button
                key={id}
                type="button"
                aria-pressed={model.overviewPanel === id}
                onClick={() => model.setOverviewPanel(id)}
              >
                {label}
                {count != null && (
                  <span className="text-fg-muted">{count}</span>
                )}
              </button>
            ))}
          </div>
          <div className="mr-overview-content">
            {model.overviewPanel === 'description' &&
              (description ? (
                <GitLabMarkdown {...model.markdownScope} text={description} />
              ) : (
                <p className="mr-pane-message">
                  {t('workbench.noDescription')}
                </p>
              ))}
            {model.overviewPanel === 'discussion' && (
              <MrDiscussionPanel model={model} />
            )}
            {model.overviewPanel === 'commits' && (
              <MrCommitList
                model={model.commits}
                onSelect={(id) => model.openEditor(undefined, id)}
              />
            )}
          </div>
        </div>
        <MrContextPanel model={model} />
        <MrOverviewChanges model={model} />
      </div>
    );
  },
);
