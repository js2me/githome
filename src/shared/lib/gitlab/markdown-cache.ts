const cache = new Map<string, string>();

export const getGitLabMarkdownCacheKey = (
  connectionId: string,
  projectPath: string,
  text: string,
) => `${connectionId}:${projectPath}:${text}`;

export const getCachedGitLabMarkdown = (key: string) => cache.get(key);

export const setCachedGitLabMarkdown = (key: string, html: string) => {
  cache.set(key, html);
};
