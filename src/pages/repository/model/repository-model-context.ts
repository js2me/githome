import type { Globals } from "@/globals";
import type { GitLabProject } from "@/shared/api/gitlab";

export interface RepositoryModelContext {
  globals: Globals;
  readonly unmountSignal: AbortSignal;
  readonly projectId: number;
  readonly selectedProject: GitLabProject | null;
  readonly mergeRequestIid: number | null;
}
