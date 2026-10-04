import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch, normalizeGitlabBaseUrl } from "../client";
import { enqueueGitLabFileContentRequest } from "../file-content-request-queue";

const MAX_CACHED_CONTENT_BYTES = 16 * 1024 * 1024;
const contentCache = new Map<string, { content: string; size: number }>();
const inFlightBySignal = new WeakMap<AbortSignal, Map<string, Promise<string>>>();
const unscopedInFlight = new Map<string, Promise<string>>();
let cachedContentBytes = 0;

const getCacheKey = (
  connection: GitLabConnection,
  projectId: number,
  filePath: string,
  ref: string,
) =>
  [
    connection.id,
    normalizeGitlabBaseUrl(connection.gitlabUrl),
    projectId,
    ref,
    filePath,
  ].join("\0");

const readCachedContent = (key: string) => {
  const cached = contentCache.get(key);
  if (!cached) {
    return null;
  }

  contentCache.delete(key);
  contentCache.set(key, cached);
  return cached.content;
};

const cacheContent = (key: string, content: string) => {
  const size = content.length * 2;
  if (size > MAX_CACHED_CONTENT_BYTES) {
    return;
  }

  const existing = contentCache.get(key);
  if (existing) {
    cachedContentBytes -= existing.size;
    contentCache.delete(key);
  }

  while (
    cachedContentBytes + size > MAX_CACHED_CONTENT_BYTES &&
    contentCache.size > 0
  ) {
    const oldestKey = contentCache.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }

    const oldest = contentCache.get(oldestKey);
    if (oldest) {
      cachedContentBytes -= oldest.size;
      contentCache.delete(oldestKey);
    }
  }

  contentCache.set(key, { content, size });
  cachedContentBytes += size;
};

const getInFlightMap = (signal?: AbortSignal) => {
  if (!signal) {
    return unscopedInFlight;
  }

  let requests = inFlightBySignal.get(signal);
  if (!requests) {
    requests = new Map();
    inFlightBySignal.set(signal, requests);
  }

  return requests;
};

export const getRepositoryFileContent = async (
  connection: GitLabConnection,
  projectId: number,
  filePath: string,
  ref: string,
  signal?: AbortSignal,
): Promise<string> => {
  const cacheKey = getCacheKey(connection, projectId, filePath, ref);
  const cached = readCachedContent(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const inFlight = getInFlightMap(signal);
  const existingRequest = inFlight.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const encodedPath = encodeURIComponent(filePath);
  const request = enqueueGitLabFileContentRequest(
    `${connection.id}\0${normalizeGitlabBaseUrl(connection.gitlabUrl)}`,
    async () => {
      const response = await gitlabFetch(
        connection,
        `/projects/${projectId}/repository/files/${encodedPath}/raw?ref=${encodeURIComponent(ref)}`,
        signal,
      );

      return response.text();
    },
    signal,
  )
    .then((content) => {
      cacheContent(cacheKey, content);
      return content;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, request);

  return request;
};
