import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabPost } from "../client";

interface GitLabMarkdownResponseDC {
  html: string;
}

export const renderMarkdown = async (
  connection: GitLabConnection,
  options: {
    text: string;
    projectPath?: string;
    signal?: AbortSignal;
  },
): Promise<string> => {
  const response = await gitlabPost<GitLabMarkdownResponseDC>(
    connection,
    "/markdown",
    {
      text: options.text,
      gfm: true,
      ...(options.projectPath ? { project: options.projectPath } : {}),
    },
    options.signal,
  );

  return response.html;
};
