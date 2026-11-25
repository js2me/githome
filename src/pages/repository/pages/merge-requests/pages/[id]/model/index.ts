import { computed, type IReactionDisposer, reaction } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import type { Workspace } from '@/features/workspace-navigation';
import { WorkspaceVM } from '@/features/workspace-navigation';
import { gitlabApi } from '@/shared/api/gitlab';
import { createGitlabApiQuery } from '@/shared/lib/gitlab/create-query';
import {
  extractJiraLinks,
  findJiraKeys,
  getJiraProjectUrl,
  splitJiraText,
} from '@/shared/lib/gitlab/jira-links';
import type { RepositoryPageVM } from '../../../../../model/page-vm';
import { MrInfoModel } from './mr-info';

export class MergeRequestPageVM extends WorkspaceVM<{}, RepositoryPageVM> {
  mrInfo;
  private readonly jiraLinksQuery;
  private disposeTabDetailsReaction: IReactionDisposer | null = null;
  private disposeReviewActionReaction: IReactionDisposer | null = null;

  get projectId() {
    return this.parentViewModel.projectId;
  }

  get selectedProject() {
    return this.parentViewModel.selectedProject;
  }

  get mergeRequestIid() {
    return this.parentViewModel.mergeRequestIid;
  }

  get project() {
    return this.parentViewModel.project;
  }

  @computed
  private get jiraKeys() {
    const mr = this.mrInfo.mergeRequestDetail;
    return mr ? findJiraKeys([mr.title, mr.source_branch].join('\n')) : [];
  }

  @computed
  private get titleJiraLinks(): Record<string, string> {
    const html = this.mrInfo.mergeRequestDetail?.title_html;
    return html && this.jiraKeys.length
      ? extractJiraLinks(html, this.jiraKeys)
      : {};
  }

  @computed
  get jiraLinks(): Record<string, string> {
    const jiraUrl = this.globals.stores.settings.activeConnection?.jiraUrl;
    const links: Record<string, string> = {};
    for (const key of this.jiraKeys) {
      const url =
        this.titleJiraLinks[key] ??
        this.jiraLinksQuery.data?.[key] ??
        (jiraUrl && `${jiraUrl}/browse/${key}`);
      if (url) links[key] = url;
    }
    return links;
  }

  @computed
  get jiraSummary() {
    const jiraLinks = this.jiraLinks;
    let offset = 0;
    const titleParts = splitJiraText(
      this.mrInfo.mergeRequestDetail?.title ?? '',
    ).map((part) => {
      const start = offset;
      offset += part.text.length;
      return { ...part, offset: start, url: part.key && jiraLinks[part.key] };
    });
    const titleKeys = new Set(titleParts.map((part) => part.key));
    const jiraProjects = new Map<string, string>();
    const branchIssues = [];
    for (const [key, url] of Object.entries(jiraLinks)) {
      const projectUrl = getJiraProjectUrl(url, key);
      if (projectUrl)
        jiraProjects.set(projectUrl, key.slice(0, key.lastIndexOf('-')));
      if (!titleKeys.has(key)) branchIssues.push({ key, url });
    }
    return { titleParts, branchIssues, jiraProjects };
  }

  constructor(
    globals: Workspace,
    params: ViewModelParams<{}, RepositoryPageVM>,
  ) {
    super(globals, params);

    this.mrInfo = new MrInfoModel({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const project = this.selectedProject;
        const mergeRequestIid = this.mergeRequestIid;

        if (!project || mergeRequestIid === null) {
          return false;
        }

        return { project, mergeRequestIid };
      },
    });

    this.jiraLinksQuery = createGitlabApiQuery<
      Record<string, string>,
      { projectPath: string; keys: string[] }
    >({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const projectPath = this.project?.path_with_namespace;
        const keys = this.jiraKeys.filter((key) => !this.titleJiraLinks[key]);
        return projectPath && keys.length ? { projectPath, keys } : null;
      },
      queryKey: ({ connection, projectPath, keys }) => [
        'mr-jira-links',
        connection.id,
        connection.gitlabUrl,
        projectPath,
        keys,
      ],
      queryFn: async ({ connection, projectPath, keys, signal }) => {
        const html = await gitlabApi.renderMarkdown(connection, {
          text: keys.join('\n\n'),
          projectPath,
          signal,
        });
        return extractJiraLinks(html, keys);
      },
      queryOptions: { staleTime: 300_000, retry: false },
    });

    this.disposeReviewActionReaction = reaction(
      () => ({
        connectionId: this.globals.stores.settings.activeId,
        projectId: this.projectId,
        mergeRequestIid: this.mergeRequestIid,
      }),
      (current, previous) => {
        if (
          current.connectionId !== previous.connectionId ||
          current.projectId !== previous.projectId ||
          current.mergeRequestIid !== previous.mergeRequestIid
        ) {
          this.mrInfo.clearReviewActionError();
          this.mrInfo.reviewActionInProgress = null;
        }
      },
    );

    this.disposeTabDetailsReaction = reaction(
      () => ({
        connectionId: this.globals.stores.settings.activeId,
        projectId: this.projectId,
        project: this.project,
        mergeRequestIid: this.mergeRequestIid,
        title: this.mrInfo.mergeRequestDetail?.title,
      }),
      ({ connectionId, projectId, project, mergeRequestIid, title }) => {
        if (
          !connectionId ||
          projectId === null ||
          mergeRequestIid === null ||
          !title
        ) {
          return;
        }

        this.globals.navigation.mergeRequests.updateDetails(
          connectionId,
          projectId,
          mergeRequestIid,
          {
            title,
            projectPath: project?.path_with_namespace,
          },
        );
      },
    );
  }

  willUnmount() {
    this.disposeTabDetailsReaction?.();
    this.disposeTabDetailsReaction = null;
    this.disposeReviewActionReaction?.();
    this.disposeReviewActionReaction = null;
  }
}
