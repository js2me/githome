import { computed } from 'mobx';
import type { InboxRow } from '@/features/review-inbox';
import {
  createInboxApprovalSummariesQuery,
  createInboxDiscussionSummariesQuery,
  createInboxReviewStatesQuery,
  type ProjectGroup,
} from '@/shared/api/gitlab/queries/merge-requests/summaries';
import { VM } from '@/shared/lib/view-models/vm';

function groupInboxRows(rows: InboxRow[]): ProjectGroup[] {
  const projects = new Map<number, ProjectGroup>();
  for (const row of rows) {
    let group = projects.get(row.project_id);
    if (!group) {
      group = { id: row.project_id, iids: [] };
      projects.set(row.project_id, group);
    }
    if (row.projectPath && !row.projectPath.startsWith('#'))
      group.path_with_namespace = row.projectPath;
    if (!group.iids.includes(row.iid)) group.iids.push(row.iid);
  }
  return [...projects.values()];
}

export class InboxPageRowsVM extends VM<{
  rows: InboxRow[];
  onSelect: (row: InboxRow) => void;
}> {
  @computed
  private get groups() {
    return groupInboxRows(this.payload.rows);
  }

  @computed
  private get reviewerGroups() {
    return groupInboxRows(
      this.payload.rows.filter(
        (row) =>
          row.detailed_merge_status !== 'requested_changes' &&
          row.reviewers?.length !== 0,
      ),
    );
  }

  private readonly approvals = createInboxApprovalSummariesQuery(
    this.globals,
    this.unmountSignal,
    () => this.groups,
  );
  private readonly discussions = createInboxDiscussionSummariesQuery(
    this.globals,
    this.unmountSignal,
    () => this.groups,
  );
  private readonly reviews = createInboxReviewStatesQuery(
    this.globals,
    this.unmountSignal,
    () => this.reviewerGroups,
  );

  statusesFor(row: InboxRow) {
    return {
      approval: this.approvals.data?.[row.project_id]?.[row.iid],
      discussions: this.discussions.data?.[row.project_id]?.[row.iid],
      review:
        row.detailed_merge_status === 'requested_changes'
          ? ('requested' as const)
          : this.reviews.data?.[row.project_id]?.[row.iid],
    };
  }
}
