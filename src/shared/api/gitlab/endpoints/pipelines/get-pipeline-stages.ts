import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { gitlabGraphql } from '../../client';

interface StagePage {
  project?: {
    pipeline?: {
      stages?: {
        nodes: { name: string | null }[];
        pageInfo: { endCursor: string | null; hasNextPage: boolean };
      } | null;
    } | null;
  } | null;
}

export const getPipelineStages = async (
  connection: GitLabConnection,
  projectPath: string,
  pipelineId: number,
  signal?: AbortSignal,
): Promise<string[]> => {
  const names = new Set<string>();
  let after: string | null = null;
  const cursors = new Set<string>();
  for (;;) {
    const result: StagePage = await gitlabGraphql<StagePage>(
      connection,
      `query PipelineStageOrder($path: ID!, $id: CiPipelineID!, $after: String) {
        project(fullPath: $path) {
          pipeline(id: $id) {
            stages(first: 100, after: $after) {
              nodes { name }
              pageInfo { endCursor hasNextPage }
            }
          }
        }
      }`,
      {
        path: projectPath,
        id: `gid://gitlab/Ci::Pipeline/${pipelineId}`,
        after,
      },
      signal,
    );
    const stages = result.project?.pipeline?.stages;
    if (!stages) break;
    for (const { name } of stages.nodes) if (name) names.add(name);
    if (!stages.pageInfo.hasNextPage) break;
    after = stages.pageInfo.endCursor;
    if (!after || cursors.has(after)) break;
    cursors.add(after);
  }
  return [...names];
};
