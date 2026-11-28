import type { ForgeSession } from '@/shared/api/forge/adapter';
import type { ForgePullRequestRef } from '@/shared/api/forge/contracts';

export const forgeConnectionKey = (session: ForgeSession) =>
  [
    'forge',
    session.provider,
    session.id,
    session.credentialsRevision ?? null,
  ] as const;

export const forgeKey = (
  session: ForgeSession,
  ...resource: (string | number)[]
) => [...forgeConnectionKey(session), ...resource] as const;

export const forgeCommentsKey = (
  session: ForgeSession,
  ref: ForgePullRequestRef,
) =>
  forgeKey(
    session,
    'repositories',
    ref.repositoryId,
    'pull-requests',
    ref.number,
    'comments',
  );
