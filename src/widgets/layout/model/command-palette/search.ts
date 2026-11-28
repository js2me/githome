import { actionBound, computed, observable } from 'mobx';
import type { Workspace } from '@/features/workspace-navigation';
import type { GitLabProjectDC } from '@/shared/api/gitlab';
import { createMergeRequestPaletteQuery } from '@/shared/api/gitlab/queries/merge-requests/list';
import { createProjectPaletteQuery } from '@/shared/api/gitlab/queries/projects';
import { parseMergeRequestLocation } from '@/shared/lib/gitlab/links/merge-request';
import { matchGitlabProject } from '@/shared/lib/gitlab/links/project';

export const parsePaletteIid = (term: string) =>
  /^!?([1-9]\d*)$/.exec(term)?.[1];

export function paletteMatches(term: string, ...fields: string[]) {
  const text = fields.join(' ').toLowerCase();
  return term
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
}

export class CommandPaletteSearch {
  @observable private accessor settledTerm = '';
  private timer?: ReturnType<typeof setTimeout>;

  private readonly projectQuery;
  private readonly requestQuery;

  constructor(
    private readonly workspace: Workspace,
    signal: AbortSignal,
    private readonly readTerm: () => string | null,
  ) {
    this.projectQuery = createProjectPaletteQuery({
      globals: workspace,
      abortSignal: signal,
      params: () => {
        const term = this.term;
        if (term == null || parsePaletteIid(term)) return null;
        return { term };
      },
      queryOptions: { retry: false, staleTime: 60_000 },
    });
    this.requestQuery = createMergeRequestPaletteQuery({
      globals: workspace,
      abortSignal: signal,
      params: () => {
        const term = this.term;
        if (!term) return null;
        const iid = parsePaletteIid(term);
        return { term, iid };
      },
      queryOptions: { retry: false, staleTime: 30_000 },
    });
    signal.addEventListener('abort', () => clearTimeout(this.timer), {
      once: true,
    });
  }

  @computed
  private get term() {
    const value = this.readTerm();
    if (!value) return value;
    if (value.length < 2 && !parsePaletteIid(value)) return null;
    return value === this.settledTerm ? value : null;
  }

  @computed
  get loading() {
    const value = this.readTerm();
    return (
      this.projectQuery.isFetching ||
      this.requestQuery.isFetching ||
      Boolean(
        value &&
          (value.length >= 2 || parsePaletteIid(value)) &&
          value !== this.settledTerm,
      )
    );
  }

  @computed
  get error() {
    return this.projectQuery.error ?? this.requestQuery.error;
  }

  @computed
  get projects() {
    const term = this.term;
    if (term == null) return [];
    const exact = (project: GitLabProjectDC) =>
      [project.name, project.path_with_namespace].some(
        (value) => value.toLowerCase() === term.toLowerCase(),
      );
    return (this.projectQuery.data ?? [])
      .filter(
        (project) =>
          !term ||
          paletteMatches(term, project.name, project.path_with_namespace),
      )
      .sort((a, b) => Number(exact(b)) - Number(exact(a)));
  }

  @computed
  get mergeRequests() {
    const term = this.term;
    if (!term) return [];
    const base = this.workspace.stores.settings.activeConnection?.gitlabUrl;
    const iid = parsePaletteIid(term);
    return (this.requestQuery.data ?? []).flatMap((request) => {
      if (
        !request.project_id ||
        (iid
          ? request.iid !== Number(iid)
          : !paletteMatches(term, request.title))
      )
        return [];
      const location = parseMergeRequestLocation(request.web_url);
      const path =
        request.references?.full?.replace(/!\d+$/, '') ||
        (location && base
          ? matchGitlabProject(location, base)?.projectPath
          : undefined);
      return path ? [{ ...request, project_id: request.project_id, path }] : [];
    });
  }

  @actionBound
  schedule() {
    clearTimeout(this.timer);
    const value = this.readTerm();
    if (!value) this.settledTerm = '';
    else this.timer = setTimeout(() => this.apply(value), 250);
  }

  @actionBound
  private apply(value: string) {
    this.settledTerm = value;
  }
}
