import { actionBound, computed } from 'mobx';
import type { ForgePullRequestFilter } from '@/shared/api/forge/contracts';
import { forgeKey } from '@/shared/lib/forge/keys';
import {
  createForgeAccountQuery,
  createForgeList,
} from '@/shared/lib/forge/queries';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { createScopedQuery } from '@/shared/lib/query/create-scoped-query';
import { GithubWorkspacePart } from './workspace-part';

type RepositoryScope = NonNullable<GithubRepositoryModel['scope']>;
const disabledKey = ['github-repository', null] as const;

export class GithubRepositoryModel extends GithubWorkspacePart {
  @computed get scope() {
    const {
      repository,
      number,
      payload: { session },
    } = this.parent;
    return session.github && repository && number == null
      ? { session, github: session.github, repository }
      : null;
  }

  @computed get isFiles() {
    return Boolean(
      this.scope && this.parent.globals.query.data.view === 'files',
    );
  }

  @computed get filter(): ForgePullRequestFilter {
    const filter = this.parent.globals.query.data.state;
    return filter === 'mine' || filter === 'merged' || filter === 'closed'
      ? filter
      : 'opened';
  }

  @computed get search() {
    return this.parent.globals.query.data.q?.trim() ?? '';
  }

  @computed get branch() {
    return (
      this.parent.globals.query.data.branch || this.defaultBranch.data || null
    );
  }

  @computed get directory() {
    return this.parent.globals.query.data.dir?.split('/').filter(Boolean) ?? [];
  }

  @computed get file() {
    return this.parent.globals.query.data.file || null;
  }

  readonly account = createForgeAccountQuery(
    () =>
      this.scope && !this.isFiles && this.filter === 'mine'
        ? this.scope.session
        : null,
    this.parent.unmountSignal,
  );

  readonly pullRequests = createForgeList(
    this.parent.unmountSignal,
    () => {
      const scope = this.scope;
      const filter = this.filter;
      const username =
        filter === 'mine' ? this.account.data?.username : undefined;
      return !scope || this.isFiles || (filter === 'mine' && !username)
        ? null
        : { ...scope, filter, username, search: this.search };
    },
    ({ session, repository, filter, username, search }) =>
      forgeKey(
        session,
        'repositories',
        repository,
        'pull-requests',
        filter,
        username ?? '',
        search,
      ),
    ({ github, repository, filter, username, search }, cursor, signal) =>
      github.listPullRequests(
        repository,
        filter,
        username,
        search,
        cursor,
        signal,
      ),
  );

  readonly defaultBranch = this.query(
    () => (this.isFiles ? this.scope : null),
    () => ['default-branch'],
    ({ github, repository }, signal) =>
      github.getDefaultBranch(repository, signal),
  );

  readonly branches = createForgeList(
    this.parent.unmountSignal,
    () => (this.isFiles ? this.scope : null),
    ({ session, repository }) =>
      forgeKey(session, 'repositories', repository, 'branches'),
    ({ github, repository }, cursor, signal) =>
      github.listBranches(repository, cursor, signal),
  );

  readonly rootTree = this.query(
    () =>
      this.isFiles && this.scope && this.branch
        ? { ...this.scope, branch: this.branch }
        : null,
    ({ branch }) => ['branch-tree', branch],
    async ({ github, repository, branch }, signal) => {
      const commit = await github.getBranch(repository, branch, signal);
      return commit ? github.getCommitTree(repository, commit, signal) : null;
    },
  );

  readonly entries = this.query(
    () =>
      this.scope && this.rootTree.data && this.isFiles
        ? { ...this.scope, tree: this.rootTree.data, directory: this.directory }
        : null,
    ({ tree, directory }) => ['tree', tree, directory.join('/')],
    async ({ github, repository, tree, directory }, signal) => {
      let entries = await github.listTree(repository, tree, signal);
      for (const name of directory) {
        const folder = entries.find(
          (entry) => entry.type === 'tree' && entry.path === name,
        );
        if (!folder)
          throw new LocalizedError('files.couldNotLoadTheFolderContents');
        entries = await github.listTree(repository, folder.sha, signal);
      }
      return entries;
    },
  );

  readonly preview = this.query(
    () => {
      const entry = this.entries.data?.find(
        ({ path, type }) => path === this.file && type === 'blob',
      );
      return this.scope && this.isFiles && entry
        ? { ...this.scope, entry }
        : null;
    },
    ({ entry }) => ['blob', entry.sha, entry.path, entry.mode],
    ({ github, repository, entry }, signal) =>
      github.getBlob(repository, entry, signal),
  );

  private query<S extends RepositoryScope, T>(
    scope: () => S | null,
    key: (scope: S) => string[],
    queryFn: (scope: S, signal: AbortSignal) => Promise<T>,
  ) {
    return createScopedQuery({
      scope,
      disabledKey,
      abortSignal: this.parent.unmountSignal,
      queryKey: (scope) =>
        forgeKey(
          scope.session,
          'repositories',
          scope.repository,
          ...key(scope),
        ),
      queryFn,
      queryOptions: { retry: false },
    });
  }

  @actionBound setView(view: 'files' | 'pulls') {
    this.parent.globals.query.update({
      view: view === 'files' ? view : null,
      branch: null,
      dir: null,
      file: null,
    });
  }

  @actionBound setFilter(filter: ForgePullRequestFilter) {
    this.parent.globals.query.update({
      state: filter === 'opened' ? null : filter,
    });
  }

  @actionBound setSearch(q: string) {
    this.parent.globals.query.update({ q: q.trim() || null });
  }

  @actionBound selectBranch(branch: string) {
    this.parent.globals.query.update({ branch, dir: null, file: null });
  }

  @actionBound selectDirectory(directory: string[]) {
    this.parent.globals.query.update({
      dir: directory.join('/') || null,
      file: null,
    });
  }

  @actionBound selectFile(file: string) {
    this.parent.globals.query.update({ file });
  }
}
