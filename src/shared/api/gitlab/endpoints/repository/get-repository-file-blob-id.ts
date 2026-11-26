import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { gitlabFetch, normalizeGitlabBaseUrl } from '../../client';
import { enqueueGitLabFileContentRequest } from '../../file-content-request-queue';

export const getRepositoryFileBlobId = (
  connection: GitLabConnection,
  projectId: number,
  filePath: string,
  ref: string,
  signal: AbortSignal,
): Promise<string> =>
  enqueueGitLabFileContentRequest(
    `${connection.id}\0${normalizeGitlabBaseUrl(connection.gitlabUrl)}`,
    async () => {
      const path = `/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(ref)}`;
      const response = await gitlabFetch(connection, path, signal, {
        method: 'HEAD',
      });
      const blobId = response.headers.get('X-Gitlab-Blob-Id');
      if (blobId) {
        return blobId;
      }

      // Some proxies don't expose the metadata headers to the renderer.
      const metadata = await gitlabFetch(connection, path, signal);
      const { blob_id } = (await metadata.json()) as { blob_id?: string };
      if (!blob_id) {
        throw new LocalizedError('gitlab.gitlabDidNotReturnAFileHash');
      }

      return blob_id;
    },
    signal,
  );
