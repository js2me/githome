import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import {
  buildDeletedFileUnifiedDiff,
  buildModifiedFileUnifiedDiff,
  buildNewFileUnifiedDiff,
} from "@/shared/lib/build-synthetic-diff";

export interface PrepareMrChangesOptions {
  loadFileContent: (filePath: string, ref: string) => Promise<string>;
  headRef: string | null;
  baseRef: string | null;
}

const needsDiffPreload = (change: GitLabMergeRequestChangeDC) => {
  if (change.diff?.trim() || change.too_large) {
    return false;
  }

  if (change.generated_file) {
    return false;
  }

  return true;
};

const prepareChange = async (
  change: GitLabMergeRequestChangeDC,
  options: PrepareMrChangesOptions,
): Promise<GitLabMergeRequestChangeDC> => {
  if (!needsDiffPreload(change)) {
    return change;
  }

  const { loadFileContent, headRef, baseRef } = options;
  if (!loadFileContent) {
    return change;
  }

  try {
    if (change.new_file && headRef) {
      const content = await loadFileContent(change.new_path, headRef);
      return {
        ...change,
        diff: buildNewFileUnifiedDiff(change.new_path, content),
      };
    }

    if (change.deleted_file && baseRef) {
      const content = await loadFileContent(change.old_path, baseRef);
      return {
        ...change,
        diff: buildDeletedFileUnifiedDiff(change.old_path, content),
      };
    }

    if (headRef && baseRef) {
      const [oldContent, newContent] = await Promise.all([
        loadFileContent(change.old_path, baseRef),
        loadFileContent(change.new_path, headRef),
      ]);

      return {
        ...change,
        diff: buildModifiedFileUnifiedDiff(
          change.old_path,
          change.new_path,
          oldContent,
          newContent,
        ),
      };
    }
  } catch {
    return change;
  }

  return change;
};

export const prepareMergeRequestChanges = async (
  changes: GitLabMergeRequestChangeDC[],
  options: PrepareMrChangesOptions,
  concurrency = 6,
): Promise<GitLabMergeRequestChangeDC[]> => {
  const result = [...changes];
  const pendingIndices = changes.flatMap((change, index) =>
    needsDiffPreload(change) ? [index] : [],
  );

  if (pendingIndices.length === 0) {
    return result;
  }

  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, pendingIndices.length) },
    async () => {
      while (cursor < pendingIndices.length) {
        const index = pendingIndices[cursor];
        cursor += 1;
        result[index] = await prepareChange(changes[index], options);
      }
    },
  );

  await Promise.all(workers);
  return result;
};
