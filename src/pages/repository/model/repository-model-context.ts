import type { Globals } from "@/globals";
import type { GitLabProjectDC } from "@/shared/api/gitlab";

export interface RepositoryModelContext {
  globals: Globals;
  readonly unmountSignal: AbortSignal;
  readonly projectId: number;
  readonly selectedProject: GitLabProjectDC | null;
  readonly mergeRequestIid: number | null;
}
