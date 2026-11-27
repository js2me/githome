import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { fetchGitlabJson, gitlabGraphql, gitlabPost } from '../../../client';
import type { GitLabProjectLabelDC } from '../../../data-contracts';

export const changeMergeRequestLabel = async (
  connection: GitLabConnection,
  target: { projectId: number; projectPath: string; iid: number },
  label: { id?: string; name: string },
  selected: boolean,
  signal: AbortSignal,
) => {
  const id =
    label.id ??
    `gid://gitlab/Label/${
      (
        await fetchGitlabJson<GitLabProjectLabelDC>(
          connection,
          `/projects/${target.projectId}/labels/${encodeURIComponent(label.name)}`,
          { signal },
        )
      ).id
    }`;
  const { mergeRequestSetLabels } = await gitlabGraphql<{
    mergeRequestSetLabels: { errors: string[] } | null;
  }>(
    connection,
    `mutation ChangeMrLabel($path: ID!, $iid: String!, $label: LabelID!, $mode: MutationOperationMode!) {
      mergeRequestSetLabels(input: {
        projectPath: $path, iid: $iid, labelIds: [$label], operationMode: $mode
      }) { errors }
    }`,
    {
      path: target.projectPath,
      iid: String(target.iid),
      label: id,
      mode: selected ? 'APPEND' : 'REMOVE',
    },
    signal,
  );
  if (mergeRequestSetLabels?.errors.length)
    throw new Error(mergeRequestSetLabels.errors.join('\n'));
  if (!mergeRequestSetLabels)
    throw new LocalizedError('common.couldNotCompleteTheAction');
};

export const createProjectLabel = (
  connection: GitLabConnection,
  projectId: number,
  label: { name: string; color: string; description: string },
  signal: AbortSignal,
) =>
  gitlabPost<GitLabProjectLabelDC>(
    connection,
    `/projects/${projectId}/labels`,
    label,
    signal,
  );
