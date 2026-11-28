import { Comment } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import {
  MrStateBadge,
  RequestRow,
  ReviewStatuses,
} from '@/entities/gitlab-merge-requests';
import { t } from '@/shared/lib/i18n';
import { MrListPageVM } from '../../model/mr-list-page';

export const MergeRequestListRows = withPropsViewModel(
  MrListPageVM,
  ({ model }) => {
    const { mergeRequests, selectedMergeRequestIid, onSelect } = model.payload;
    const approvals = model.approvals.error ? undefined : model.approvals.data;
    const discussions = model.discussions.error
      ? undefined
      : model.discussions.data;
    return (
      <>
        {mergeRequests.map((mr) => (
          <RequestRow
            key={mr.id}
            statusId={`mr-list-status-${mr.id}`}
            label={t('review.open3', { v1: mr.iid, v2: mr.title })}
            number={`!${mr.iid}`}
            title={mr.title}
            authorName={
              mr.author?.name ??
              mr.author?.username ??
              t('review.unknownAuthor')
            }
            avatarUrl={mr.author?.avatar_url}
            updatedAt={mr.updated_at}
            sourceBranch={mr.source_branch}
            targetBranch={mr.target_branch}
            selected={selectedMergeRequestIid === mr.iid}
            onSelect={() => onSelect(mr)}
            status={
              <>
                <MrStateBadge mergeRequest={mr} />
                <ReviewStatuses
                  approval={approvals?.[mr.iid]}
                  discussions={discussions?.[mr.iid]}
                />
                {mr.user_notes_count != null && mr.user_notes_count > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-fg-muted text-xs tabular-nums"
                    title={t('review.comments2', { v1: mr.user_notes_count })}
                  >
                    <Comment width={14} height={14} aria-hidden />
                    <span className="sr-only">{t('review.comments3')} </span>
                    {mr.user_notes_count}
                  </span>
                )}
              </>
            }
          />
        ))}
      </>
    );
  },
);
