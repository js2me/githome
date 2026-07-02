import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabPostForm } from "../client";
import type { GitLabMarkdownUploadDC } from "../data-contracts";

export const uploadProjectMarkdown = async (
  connection: GitLabConnection,
  projectId: number,
  file: File,
  signal?: AbortSignal,
): Promise<GitLabMarkdownUploadDC> => {
  const formData = new FormData();
  formData.append("file", file, file.name);

  return gitlabPostForm<GitLabMarkdownUploadDC>(
    connection,
    `/projects/${projectId}/uploads`,
    formData,
    signal,
  );
};
