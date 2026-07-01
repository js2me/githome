import { useEffect, useState } from "react";
import {
  fetchGitlabAssetBlob,
  isGitlabProxiedAssetUrl,
  resolveGitlabAssetUrl,
} from "@/shared/api/gitlab";
import { cn } from "@/shared/lib/cn";
import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { useGitLabConnection } from "@/shared/lib/gitlab/connection-context";

const resolveAvatarSrc = (
  connection: GitLabConnection | null,
  avatarUrl: string | null | undefined,
) => {
  if (!avatarUrl) {
    return null;
  }

  return connection ? resolveGitlabAssetUrl(connection, avatarUrl) : avatarUrl;
};

const AvatarFallback = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => (
  <div
    className={cn(
      "grid place-items-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300",
      className,
    )}
    title={name}
  >
    {name.slice(0, 1).toUpperCase()}
  </div>
);

export const GitlabAvatar = ({
  avatarUrl,
  name,
  className,
  connection: connectionProp,
}: {
  avatarUrl: string | null | undefined;
  name: string;
  className?: string;
  connection?: GitLabConnection | null;
}) => {
  const connectionFromContext = useGitLabConnection();
  const connection = connectionProp ?? connectionFromContext;
  const src = resolveAvatarSrc(connection, avatarUrl);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    setDisplaySrc(null);

    if (!src || !avatarUrl) {
      return;
    }

    if (!isGitlabProxiedAssetUrl(src)) {
      setDisplaySrc(src);
      return;
    }

    if (!connection) {
      setHasError(true);
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | null = null;

    void fetchGitlabAssetBlob(connection, avatarUrl, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setDisplaySrc(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHasError(true);
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [avatarUrl, connection, src]);

  if (displaySrc && !hasError) {
    return (
      <img
        className={className}
        src={displaySrc}
        alt=""
        title={name}
        onError={() => setHasError(true)}
      />
    );
  }

  return <AvatarFallback name={name} className={className} />;
};
