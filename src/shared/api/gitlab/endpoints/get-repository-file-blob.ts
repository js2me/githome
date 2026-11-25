import type { GitLabConnection } from '@/shared/lib/gitlab/connection';
import { getImageMimeType } from '@/shared/lib/image-path';
import { gitlabFetch, normalizeGitlabBaseUrl } from '../client';
import { enqueueGitLabFileContentRequest } from '../file-content-request-queue';

export const getRepositoryFileImage = (
  connection: GitLabConnection,
  projectId: number,
  filePath: string,
  ref: string,
  signal?: AbortSignal,
): Promise<Blob> =>
  enqueueGitLabFileContentRequest(
    `${connection.id}\0${normalizeGitlabBaseUrl(connection.gitlabUrl)}`,
    async () => {
      const encodedPath = encodeURIComponent(filePath);
      const params = new URLSearchParams({ ref, lfs: 'true' });
      const response = await gitlabFetch(
        connection,
        `/projects/${projectId}/repository/files/${encodedPath}/raw?${params}`,
        signal,
      );
      const blob = await response.blob();
      const mimeType = getImageMimeType(filePath);

      return !blob.type.startsWith('image/') && mimeType
        ? new Blob([blob], { type: mimeType })
        : blob;
    },
    signal,
  );

export const getRepositoryFileBlob = async (
  connection: GitLabConnection,
  projectId: number,
  filePath: string,
  ref: string,
  signal?: AbortSignal,
): Promise<{ blob: Blob; content: string }> => {
  const blob = await getRepositoryFileImage(
    connection,
    projectId,
    filePath,
    ref,
    signal,
  );
  return { blob, content: await blob.text() };
};
