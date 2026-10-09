import { describe, expect, it } from "vitest";
import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import { buildChangesTree } from "./build-changes-tree";

const makeChange = (
  overrides: Partial<GitLabMergeRequestChangeDC> = {},
): GitLabMergeRequestChangeDC => ({
  old_path: "src/model.test.ts",
  new_path: "src/model.test.ts",
  diff: "@@ -0,0 +1,2 @@\n+first line\n+second line",
  new_file: true,
  renamed_file: false,
  deleted_file: false,
  ...overrides,
});

describe("buildChangesTree line stats", () => {
  it("parses diff stats when GitLab metadata reports zero lines", () => {
    const [folder] = buildChangesTree([
      makeChange({ added_lines: 0, removed_lines: 0 }),
    ]);

    expect(folder.type).toBe("folder");
    if (folder.type !== "folder") {
      return;
    }

    expect(folder.children[0]).toMatchObject({ additions: 2, deletions: 0 });
  });

  it("keeps larger server counts for collapsed or partial diffs", () => {
    const [folder] = buildChangesTree([
      makeChange({ added_lines: 20, removed_lines: 4 }),
    ]);

    expect(folder.type).toBe("folder");
    if (folder.type !== "folder") {
      return;
    }

    expect(folder.children[0]).toMatchObject({ additions: 20, deletions: 4 });
  });
});
