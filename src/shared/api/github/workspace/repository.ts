import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { type CloudRequest, CloudRequestError } from '../../forge/cloud-client';
import { repositoryPath } from '../paths';
import { githubList } from './list';

interface Branch {
  name: string;
  commit: { sha: string };
}
interface TreeEntry {
  path: string;
  sha: string;
  type: 'tree' | 'blob' | 'commit';
  mode: string;
  size?: number;
}
interface Blob {
  encoding: string;
  content: string;
  size: number;
}

const maxPreviewBytes = 2 * 1024 * 1024;
const rasterType = (path: string) =>
  /\.(png|jpe?g|gif|webp|bmp|ico)$/i.exec(path)?.[1].toLowerCase();

function decodeBlob(blob: Blob, path: string) {
  if (blob.encoding !== 'base64' || blob.size > maxPreviewBytes) {
    throw new LocalizedError('forge.previewUnavailable');
  }
  const base64 = blob.content.replace(/\s/g, '');
  const image = rasterType(path);
  if (image) {
    const type = /^jpe?g$/.test(image)
      ? 'jpeg'
      : image === 'ico'
        ? 'x-icon'
        : image;
    return { image: `data:image/${type};base64,${base64}`, text: null };
  }
  try {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.includes('\0')) throw new Error('Binary file');
    return { image: null, text };
  } catch {
    throw new LocalizedError('forge.previewUnavailable');
  }
}

const blobPath = (repository: string, sha: string) =>
  `${repositoryPath(repository)}/git/blobs/${encodeURIComponent(sha)}`;

export const createGithubRepositoryApi = (request: CloudRequest) => ({
  getDefaultBranch: async (id: string, signal: AbortSignal) =>
    (await request<{ default_branch: string }>(repositoryPath(id), signal)).data
      .default_branch,
  listBranches: (id: string, cursor: string | undefined, signal: AbortSignal) =>
    githubList<Branch>(
      request,
      cursor ?? `${repositoryPath(id)}/branches?per_page=100`,
      signal,
    ),
  getBranch: async (id: string, branch: string, signal: AbortSignal) => {
    try {
      const { data } = await request<Branch>(
        `${repositoryPath(id)}/branches/${encodeURIComponent(branch)}`,
        signal,
      );
      return data.commit.sha;
    } catch (error) {
      if (error instanceof CloudRequestError && error.status === 404)
        return null;
      throw error;
    }
  },
  getCommitTree: async (id: string, sha: string, signal: AbortSignal) =>
    (
      await request<{ tree: { sha: string } }>(
        `${repositoryPath(id)}/git/commits/${encodeURIComponent(sha)}`,
        signal,
      )
    ).data.tree.sha,
  listTree: async (id: string, sha: string, signal: AbortSignal) => {
    const { data } = await request<{ tree: TreeEntry[]; truncated?: boolean }>(
      `${repositoryPath(id)}/git/trees/${encodeURIComponent(sha)}`,
      signal,
    );
    if (data.truncated)
      throw new LocalizedError('files.couldNotLoadTheFolderContents');
    return [...data.tree].sort(
      (a, b) =>
        Number(b.type === 'tree') - Number(a.type === 'tree') ||
        a.path.localeCompare(b.path),
    );
  },
  getBlob: async (id: string, entry: TreeEntry, signal: AbortSignal) => {
    if (entry.size != null && entry.size > maxPreviewBytes) {
      throw new LocalizedError('forge.previewUnavailable');
    }
    return decodeBlob(
      (await request<Blob>(blobPath(id, entry.sha), signal)).data,
      entry.mode === '120000' ? '' : entry.path,
    );
  },
  getCommitFile: async (
    id: string,
    path: string,
    sha: string,
    signal: AbortSignal,
  ) => {
    const url = `${repositoryPath(id)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(sha)}`;
    const { data } = await request<Blob & { sha?: string }>(url, signal);
    // The Contents API omits the body of files over 1 MB even when a blob preview fits our limit.
    if (data.encoding === 'none' && data.sha && data.size <= maxPreviewBytes) {
      const blob = await request<Blob>(blobPath(id, data.sha), signal);
      return decodeBlob(blob.data, path);
    }
    return decodeBlob(data, path);
  },
  getMergeBase: async (
    id: string,
    base: string,
    head: string,
    signal: AbortSignal,
  ) =>
    (
      await request<{ merge_base_commit: { sha: string } }>(
        `${repositoryPath(id)}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}?per_page=1`,
        signal,
      )
    ).data.merge_base_commit.sha,
});
