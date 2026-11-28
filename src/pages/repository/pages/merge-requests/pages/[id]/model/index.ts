import { computed, type IReactionDisposer, reaction } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import type { Workspace } from '@/features/workspace-navigation';
import { WorkspaceVM } from '@/features/workspace-navigation';
import { createMergeRequestJiraLinksQuery } from '@/shared/api/gitlab/queries/merge-requests/detail';
import {
  extractJiraLinks,
  findJiraKeys,
  getJiraProjectUrl,
  splitJiraText,
} from '@/shared/lib/gitlab/markdown/jira-links';
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
      target: () => {
        const { projectId, mergeRequestIid } = this;
        return projectId === null || mergeRequestIid === null
          ? false
          : { projectId, mergeRequestIid };
      },
      params: () => {
        const project = this.selectedProject;
        const mergeRequestIid = this.mergeRequestIid;

        if (!project || mergeRequestIid === null) {
          return false;
        }

        return { project, mergeRequestIid };
      },
    });

    this.jiraLinksQuery = createMergeRequestJiraLinksQuery({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const projectPath = this.project?.path_with_namespace;
        const keys = this.jiraKeys.filter((key) => !this.titleJiraLinks[key]);
        return projectPath && keys.length ? { projectPath, keys } : null;
      },
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
          this.mrInfo.resetMrAction();
        }
      },
    );

    this.disposeTabDetailsReaction = reaction(
      () => ({
        connectionId: this.globals.stores.settings.activeId,
        projectId: this.projectId,
        project: this.project,
        mergeRequestIid: this.mergeRequestIid,
        detail: this.mrInfo.mergeRequestDetail,
      }),
      ({ connectionId, projectId, project, mergeRequestIid, detail }) => {
        if (
          !connectionId ||
          projectId === null ||
          mergeRequestIid === null ||
          detail?.iid !== mergeRequestIid ||
          (detail.project_id != null && detail.project_id !== projectId)
        ) {
          return;
        }

        this.globals.navigation.mergeRequests.updateDetails(
          connectionId,
          projectId,
          mergeRequestIid,
          {
            title: detail.title,
            projectPath: project?.path_with_namespace,
            namespaceKind: project?.namespace?.kind,
            status: {
              state: detail.state,
              draft: detail.draft,
              work_in_progress: detail.work_in_progress,
              detailed_merge_status: detail.detailed_merge_status,
            },
          },
        );
      },
      { fireImmediately: true },
    );
  }

  willUnmount() {
    this.disposeTabDetailsReaction?.();
    this.disposeTabDetailsReaction = null;
    this.disposeReviewActionReaction?.();
    this.disposeReviewActionReaction = null;
  }
}
