import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch, normalizeGitlabBaseUrl } from "../client";
import { enqueueGitLabFileContentRequest } from "../file-content-request-queue";

const IMAGE_MIME_TYPES: Record<string, string> = {
  apng: "image/apng",
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  ico: "image/x-icon",
  jfif: "image/jpeg",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

export const getRepositoryFileBlob = (
  connection: GitLabConnection,
  projectId: number,
  filePath: string,
  ref: string,
  signal?: AbortSignal,
): Promise<{ blob: Blob; content: string }> =>
  enqueueGitLabFileContentRequest(
    `${connection.id}\0${normalizeGitlabBaseUrl(connection.gitlabUrl)}`,
    async () => {
      const encodedPath = encodeURIComponent(filePath);
      const response = await gitlabFetch(
        connection,
        `/projects/${projectId}/repository/files/${encodedPath}/raw?ref=${encodeURIComponent(ref)}`,
        signal,
      );
      const blob = await response.blob();
      const content = await blob.text();
      const mimeType = blob.type.startsWith("image/")
        ? blob.type
        : IMAGE_MIME_TYPES[filePath.split(".").pop()?.toLowerCase() ?? ""];

      return {
        blob: mimeType ? new Blob([blob], { type: mimeType }) : blob,
        content,
      };
    },
    signal,
  );
