import { observer } from 'mobx-react-lite';
import { parseWebUrl } from '@/shared/lib/gitlab/links/gitlab-url';
import { t } from '@/shared/lib/i18n';
import type { ForgeWorkspaceVM } from '../model/workspace';
import { ForgeLoadMore } from './load-more';
import { ForgeQueryStatus } from './query-status';

export const ForgeRequestDetails = observer(
  ({ model }: { model: ForgeWorkspaceVM }) => {
    const pullRequest = model.pullRequest.data;
    const comments = model.comments.data?.pages.flatMap((page) => page.items);
    const mutation = model.createComment;
    const webUrl = pullRequest && parseWebUrl(pullRequest.webUrl);
    return (
      <div className="grid min-w-0 gap-4">
        <ForgeQueryStatus query={model.pullRequest} />
        {pullRequest && (
          <>
            <h1 className="break-words font-bold text-xl">
              #{pullRequest.number} {pullRequest.title}
            </h1>
            <p className="break-all text-fg-muted text-sm">
              {pullRequest.author?.name} · {pullRequest.sourceBranch} →{' '}
              {pullRequest.targetBranch}
              {pullRequest.draft && ` · ${t('review.draft')}`}
            </p>
            {webUrl && (
              <a
                className="w-fit text-[var(--glass-accent)] underline"
                href={webUrl.href}
                target="_blank"
                rel="noreferrer"
              >
                {t('forge.openOnProvider')}
              </a>
            )}
            {pullRequest.description && (
              <p className="whitespace-pre-wrap break-words">
                {pullRequest.description}
              </p>
            )}
            <h2 className="font-semibold text-lg">{t('review.comments')}</h2>
            <ForgeQueryStatus query={model.comments} />
            {comments?.length === 0 && !model.comments.hasNextPage && (
              <p>{t('forge.noComments')}</p>
            )}
            <ul className="grid gap-2">
              {comments?.map((comment) => (
                <li className="glass-control rounded-lg p-3" key={comment.id}>
                  <p className="font-semibold text-sm">
                    {comment.author?.name}
                  </p>
                  <p className="whitespace-pre-wrap break-words">
                    {comment.body}
                  </p>
                </li>
              ))}
            </ul>
            <ForgeLoadMore query={model.comments} />
            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void model.submitComment();
              }}
            >
              <label className="grid gap-2">
                {t('review.enterAComment')}
                <textarea
                  className="glass-input w-full rounded-lg p-3"
                  disabled={mutation.isPending}
                  rows={3}
                  value={model.draft}
                  onChange={(event) => model.setDraft(event.target.value)}
                />
              </label>
              {mutation.error && <p role="alert">{mutation.error.message}</p>}
              <button
                className="glass-primary w-fit rounded-lg px-3 py-2"
                type="submit"
                disabled={mutation.isPending || !model.draft.trim()}
              >
                {t('forge.postComment')}
              </button>
            </form>
          </>
        )}
      </div>
    );
  },
);
