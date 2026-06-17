import { computed } from "mobx";
import type { Globals } from "@/globals";
import type { GitLabProjectReadmeDC } from "@/shared/api/gitlab";
import {
  decodeProjectReadmeContent,
  README_FALLBACK_PATHS,
} from "@/shared/api/gitlab/endpoints/get-project-readme";
import { createGitlabQuery } from "@/shared/lib/gitlab/create-query";

type ReadmeQuery = ReturnType<typeof createGitlabQuery<GitLabProjectReadmeDC | null>>;

export interface ProjectReadmeParams {
  globals: Globals;
  abortSignal: AbortSignal;
  projectId: () => number;
  defaultBranch: () => string | null | undefined;
}

export class ProjectReadmeModel {
  endpointQuery: ReadmeQuery;
  private fallbackQueries: ReadmeQuery[] = [];

  constructor(params: ProjectReadmeParams) {
    this.endpointQuery = createGitlabQuery<GitLabProjectReadmeDC | null>({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () => {
        const ref = params.defaultBranch()?.trim();
        if (!ref) {
          return false;
        }

        return {
          path: `/projects/${params.projectId()}/repository/readme`,
          query: { ref },
          notFoundAsNull: true,
        };
      },
      select: (data) =>
        data
          ? decodeProjectReadmeContent(data as GitLabProjectReadmeDC)
          : null,
    });

    const refGroups = [
      {
        offset: 0,
        resolveRef: () => params.defaultBranch()?.trim() ?? null,
      },
      {
        offset: README_FALLBACK_PATHS.length,
        resolveRef: () => "HEAD",
      },
    ] as const;

    for (const group of refGroups) {
      README_FALLBACK_PATHS.forEach((filePath, fileIndex) => {
        const queryIndex = group.offset + fileIndex;

        this.fallbackQueries.push(
          createGitlabQuery<GitLabProjectReadmeDC | null>({
            globals: params.globals,
            abortSignal: params.abortSignal,
            params: () => {
              const ref = group.resolveRef();
              if (!ref || !this.shouldRunFallback(queryIndex)) {
                return false;
              }

              return {
                path: `/projects/${params.projectId()}/repository/files/${encodeURIComponent(filePath)}/raw`,
                query: { ref },
                responseType: "text",
                notFoundAsNull: true,
              };
            },
            select: (text) => {
              if (typeof text !== "string" || !text) {
                return null;
              }

              return {
                file_name: filePath.split("/").pop() ?? filePath,
                file_path: filePath,
                content: text,
              };
            },
          }),
        );
      });
    }
  }

  private shouldRunFallback(index: number): boolean {
    if (!this.endpointQuery.isFetched || this.endpointQuery.isFetching) {
      return false;
    }

    if (this.endpointQuery.data) {
      return false;
    }

    for (let i = 0; i < index; i++) {
      const query = this.fallbackQueries[i];

      if (query.isFetching || query.isLoading) {
        return false;
      }

      if (!query.isFetched) {
        return false;
      }

      if (query.data) {
        return false;
      }
    }

    return true;
  }

  private get queries() {
    return [this.endpointQuery, ...this.fallbackQueries];
  }

  @computed
  get readme(): GitLabProjectReadmeDC | null {
    if (this.endpointQuery.data) {
      return this.endpointQuery.data;
    }

    for (const query of this.fallbackQueries) {
      if (query.data) {
        return query.data;
      }
    }

    return null;
  }

  @computed
  get isLoading() {
    if (this.readme) {
      return false;
    }

    return this.queries.some((query) => query.isLoading || query.isFetching);
  }

  @computed
  get errorMessage() {
    if (this.readme || this.isLoading) {
      return null;
    }

    const error = this.queries.find((query) => query.error)?.error;
    if (!error) {
      return null;
    }

    return error instanceof Error
      ? error.message
      : "Не удалось загрузить README";
  }
}
