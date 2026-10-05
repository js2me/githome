import { action, computed, observable } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import type {
  GitLabMergeRequestDC,
  GitLabProjectAnalyticsDC,
} from "@/shared/api/gitlab";
import { gitlabApi } from "@/shared/api/gitlab";
import { createGitlabApiQuery } from "@/shared/lib/gitlab/create-query";
import { VM } from "@/shared/lib/view-models/vm";
import { RepositoryPageVM } from "@/pages/repository/model/page-vm";

const JIRA_ID_PATTERN = /\b[A-Z][A-Z0-9]+-\d+\b/i;
const hasJiraId = (mergeRequest: GitLabMergeRequestDC) =>
  JIRA_ID_PATTERN.test(
    [
      mergeRequest.title,
      mergeRequest.description,
      mergeRequest.source_branch,
      mergeRequest.target_branch,
    ]
      .filter(Boolean)
      .join("\n"),
  );
const getChangedFileCount = (mergeRequest: GitLabMergeRequestDC) => {
  const count = Number.parseInt(mergeRequest.changes_count ?? "", 10);
  return Number.isFinite(count) ? count : 0;
};

type AnalyticsPeriod = 30 | 90 | 180;

export class AnalyticsPageVM extends VM<{}, RepositoryPageVM> {
  @observable accessor period: AnalyticsPeriod = 90;
  @observable.ref accessor analyticsProgress: GitLabProjectAnalyticsDC = {
    commits: [],
    mergedMergeRequests: [],
  };
  @observable accessor hasAnalyticsProgress = false;
  @observable accessor analyticsProgressKey: string | null = null;

  private analyticsRequestId = 0;

  readonly analyticsQuery;

  constructor(
    globals: Globals,
    params: ViewModelParams<{}, RepositoryPageVM>,
  ) {
    super(globals, params);

    this.analyticsQuery = createGitlabApiQuery<
      GitLabProjectAnalyticsDC,
      {
        projectId: number;
        defaultBranch: string | null;
        since: string;
        until: string;
      }
    >({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const projectId = this.parentViewModel.projectId;
        if (projectId === null) {
          return false;
        }

        return {
          projectId,
          defaultBranch:
            this.parentViewModel.project?.default_branch?.trim() || null,
          since: this.range.since,
          until: this.range.until,
        };
      },
      queryKey: ({ connection, projectId, defaultBranch, since, until }) =>
        [
          "repository-analytics",
          connection.gitlabUrl,
          projectId,
          defaultBranch,
          since,
          until,
        ] as const,
      queryFn: async ({
        connection,
        projectId,
        defaultBranch,
        since,
        until,
        signal,
      }) => {
        const progressKey = JSON.stringify([
          connection.gitlabUrl,
          projectId,
          defaultBranch,
          since,
          until,
        ]);
        const requestId = this.beginAnalyticsProgress(progressKey);
        return gitlabApi.getProjectAnalytics(
          connection,
          projectId,
          defaultBranch,
          since,
          until,
          signal,
          (analytics) => this.updateAnalyticsProgress(requestId, analytics),
        );
      },
    });
  }

  @computed
  get range() {
    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (this.period - 1));
    start.setUTCHours(0, 0, 0, 0);

    return {
      start,
      since: start.toISOString(),
      until: end.toISOString(),
    };
  }

  @computed
  private get currentAnalyticsKey() {
    const connection = this.globals.stores.settings.activeConnection;
    const projectId = this.parentViewModel.projectId;
    if (!connection || projectId === null) {
      return null;
    }

    return JSON.stringify([
      connection.gitlabUrl,
      projectId,
      this.parentViewModel.project?.default_branch?.trim() || null,
      this.range.since,
      this.range.until,
    ]);
  }

  @computed
  get analytics(): GitLabProjectAnalyticsDC {
    return this.hasAnalyticsProgress &&
      this.analyticsProgressKey === this.currentAnalyticsKey
      ? this.analyticsProgress
      : this.analyticsQuery.data ?? {
          commits: [],
          mergedMergeRequests: [],
        };
  }

  @computed
  get hasAnalyticsData() {
    return (
      (this.hasAnalyticsProgress &&
        this.analyticsProgressKey === this.currentAnalyticsKey) ||
      this.analyticsQuery.data !== undefined
    );
  }

  @computed
  get mergeRequestsWithJiraId() {
    return this.analytics.mergedMergeRequests.filter(hasJiraId);
  }

  @computed
  get totalChangedFiles() {
    return this.analytics.mergedMergeRequests.reduce(
      (total, mergeRequest) => total + getChangedFileCount(mergeRequest),
      0,
    );
  }

  @computed
  get authorChanges() {
    const changesByAuthor = new Map<
      string,
      { author: string; mergeRequests: number; changedFiles: number }
    >();

    for (const mergeRequest of this.analytics.mergedMergeRequests) {
      const author = mergeRequest.author?.name?.trim() || "Без имени";
      const username = mergeRequest.author?.username?.trim().toLowerCase();
      const key = username || author.toLowerCase();
      const stats = changesByAuthor.get(key) ?? {
        author,
        mergeRequests: 0,
        changedFiles: 0,
      };

      stats.mergeRequests += 1;
      stats.changedFiles += getChangedFileCount(mergeRequest);
      changesByAuthor.set(key, stats);
    }

    return [...changesByAuthor.values()]
      .sort(
        (left, right) =>
          right.changedFiles - left.changedFiles ||
          right.mergeRequests - left.mergeRequests,
      )
      .slice(0, 10);
  }

  @computed
  get activityBuckets() {
    const bucketDays = this.period === 30 ? 1 : 7;
    const bucketCount = Math.ceil(this.period / bucketDays);
    const bucketDuration = bucketDays * 24 * 60 * 60 * 1000;
    const counts = Array.from({ length: bucketCount }, () => ({
      commits: 0,
      mergeRequests: 0,
      jiraMergeRequests: 0,
    }));

    for (const commit of this.analytics.commits) {
      const index = Math.floor(
        (Date.parse(commit.committed_date) - this.range.start.getTime()) /
          bucketDuration,
      );
      if (index >= 0 && index < counts.length) {
        counts[index].commits += 1;
      }
    }

    for (const mergeRequest of this.analytics.mergedMergeRequests) {
      if (!mergeRequest.merged_at) {
        continue;
      }

      const index = Math.floor(
        (Date.parse(mergeRequest.merged_at) - this.range.start.getTime()) /
          bucketDuration,
      );
      if (index >= 0 && index < counts.length) {
        counts[index].mergeRequests += 1;
        if (hasJiraId(mergeRequest)) {
          counts[index].jiraMergeRequests += 1;
        }
      }
    }

    return counts.map((count, index) => {
      const date = new Date(
        this.range.start.getTime() + index * bucketDuration,
      );

      return {
        ...count,
        label: date.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }),
      };
    });
  }

  @computed
  get isLoading() {
    return this.analyticsQuery.isLoading || this.analyticsQuery.isFetching;
  }

  @action.bound
  private beginAnalyticsProgress(progressKey: string) {
    this.analyticsRequestId += 1;
    this.analyticsProgress = { commits: [], mergedMergeRequests: [] };
    this.hasAnalyticsProgress = false;
    this.analyticsProgressKey = progressKey;
    return this.analyticsRequestId;
  }

  @action.bound
  private updateAnalyticsProgress(
    requestId: number,
    analytics: GitLabProjectAnalyticsDC,
  ) {
    if (requestId !== this.analyticsRequestId) {
      return;
    }

    this.analyticsProgress = analytics;
    this.hasAnalyticsProgress = true;
  }

  @computed
  get errorMessage() {
    const error = this.analyticsQuery.error;
    return error instanceof Error
      ? error.message
      : error
        ? "Не удалось загрузить аналитику репозитория"
        : null;
  }

  @action.bound
  setPeriod(value: string) {
    const period = Number(value);
    if (period === 30 || period === 90 || period === 180) {
      this.period = period;
    }
  }
}
