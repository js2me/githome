import type { GitLabWebDiffFileDC } from "@/shared/lib/gitlab/map-gitlab-web-diff-file";

export const getMergeRequestDiffFileKey = (
  file: Pick<
    GitLabWebDiffFileDC,
    "old_path" | "new_path" | "file_identifier_hash"
  >,
) => file.file_identifier_hash ?? `${file.old_path}\0${file.new_path}`;
