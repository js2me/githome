import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type { GitLabProjectReadmeDC } from "../data-contracts";
import { getRepositoryFileContent } from "./get-repository-file-content";

const decodeGitLabBase64Content = (value: string) => {
  const normalized = value.replace(/\s/g, "");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const decodeProjectReadmeContent = (
  readme: GitLabProjectReadmeDC,
): GitLabProjectReadmeDC => ({
  ...readme,
  content:
    readme.encoding === "base64"
      ? decodeGitLabBase64Content(readme.content)
      : readme.content,
});

export const README_FALLBACK_PATHS = [
  "README.md",
  "Readme.md",
  "readme.md",
  "README.MD",
] as const;

const fetchProjectReadmeFromFile = async (
  connection: GitLabConnection,
  projectId: number,
  ref: string,
  signal?: AbortSignal,
): Promise<GitLabProjectReadmeDC | null> => {
  for (const filePath of README_FALLBACK_PATHS) {
    try {
      const content = await getRepositoryFileContent(
        connection,
        projectId,
        filePath,
        ref,
        signal,
      );

      return {
        file_name: filePath.split("/").pop() ?? filePath,
        file_path: filePath,
        content,
      };
    } catch {
      continue;
    }
  }

  return null;
};

export const getProjectReadme = async (
  connection: GitLabConnection,
  projectId: number,
  options?: { ref?: string | null; signal?: AbortSignal },
): Promise<GitLabProjectReadmeDC | null> => {
  const signal = options?.signal;
  const ref = options?.ref?.trim() || null;
  const readmePath = ref
    ? `/projects/${projectId}/repository/readme?ref=${encodeURIComponent(ref)}`
    : `/projects/${projectId}/repository/readme`;

  try {
    const response = await gitlabFetch(connection, readmePath, signal);
    const readme = (await response.json()) as GitLabProjectReadmeDC;
    return decodeProjectReadmeContent(readme);
  } catch {
    const refsToTry = ref ? [ref, "HEAD"] : ["HEAD"];

    for (const nextRef of refsToTry) {
      const readme = await fetchProjectReadmeFromFile(
        connection,
        projectId,
        nextRef,
        signal,
      );

      if (readme) {
        return readme;
      }
    }

    return null;
  }
};
