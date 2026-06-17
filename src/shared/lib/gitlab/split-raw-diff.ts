const DIFF_GIT_HEADER_RE = /^diff --git a\/(.+?) b\/(.+)$/m;

export const splitRawDiffByFile = (raw: string): Map<string, string> => {
  const result = new Map<string, string>();

  if (!raw.trim()) {
    return result;
  }

  const parts = raw.split(/(?=^diff --git )/m).filter((part) => part.trim());

  for (const part of parts) {
    const headerMatch = part.match(DIFF_GIT_HEADER_RE);
    if (!headerMatch) {
      continue;
    }

    const oldPath = headerMatch[1];
    const newPath = headerMatch[2];

    result.set(newPath, part);
    if (oldPath !== newPath) {
      result.set(oldPath, part);
    }
  }

  return result;
};
