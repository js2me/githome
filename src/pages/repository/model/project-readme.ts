import { computed } from 'mobx';
import type { GitLabProjectReadmeDC } from '@/shared/api/gitlab';
import {
  decodeProjectReadmeContent,
  README_FALLBACK_PATHS,
} from '@/shared/api/gitlab/endpoints/repository/get-project-readme';
import {
  createProjectRawReadmeQuery,
  createProjectReadmeQuery,
} from '@/shared/api/gitlab/queries/projects';
import { t } from '@/shared/lib/i18n';
import type { Globals } from '@/shared/model/globals';

type ReadmeQuery = ReturnType<typeof createProjectReadmeQuery>;

export interface ProjectReadmeParams {
  globals: Globals;
  abortSignal: AbortSignal;
  projectId: () => number | null;
  defaultBranch: () => string | null | undefined;
}

export class ProjectReadmeModel {
  endpointQuery: ReadmeQuery;
  private fallbackQueries: ReadmeQuery[] = [];

  constructor(params: ProjectReadmeParams) {
    this.endpointQuery = createProjectReadmeQuery({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () => {
        const projectId = params.projectId();
        const ref = params.defaultBranch()?.trim();
        if (projectId === null || !ref) {
          return false;
        }

        return { projectId, ref };
      },
      queryOptions: {
        select: (data) =>
          data
            ? decodeProjectReadmeContent(data as GitLabProjectReadmeDC)
            : null,
      },
    });

    const refGroups = [
      {
        offset: 0,
        resolveRef: () => params.defaultBranch()?.trim() ?? null,
      },
      {
        offset: README_FALLBACK_PATHS.length,
        resolveRef: () => 'HEAD',
      },
    ] as const;

    for (const group of refGroups) {
      README_FALLBACK_PATHS.forEach((filePath, fileIndex) => {
        const queryIndex = group.offset + fileIndex;

        this.fallbackQueries.push(
          createProjectRawReadmeQuery({
            globals: params.globals,
            abortSignal: params.abortSignal,
            params: () => {
              const projectId = params.projectId();
              const ref = group.resolveRef();
              if (
                projectId === null ||
                !ref ||
                !this.shouldRunFallback(queryIndex)
              ) {
                return false;
              }

              return { projectId, ref, filePath };
            },
            queryOptions: {
              select: (text) => {
                if (typeof text !== 'string' || !text) {
                  return null;
                }

                return {
                  file_name: filePath.split('/').pop() ?? filePath,
                  file_path: filePath,
                  content: text,
                };
              },
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
      : t('repository.couldNotLoadTheReadme');
  }
}
