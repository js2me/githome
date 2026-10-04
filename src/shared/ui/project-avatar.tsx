import { makeIdentIconDataUrl } from "gologen";
import { GitlabAvatar } from "@/shared/ui/gitlab-avatar";

export const ProjectAvatar = ({
  id,
  avatarUrl,
  name,
  className,
}: {
  id: number;
  avatarUrl?: string | null;
  name: string;
  className: string;
}) => {
  if (avatarUrl) {
    return (
      <GitlabAvatar
        className={className}
        avatarUrl={avatarUrl}
        name={name}
      />
    );
  }

  return (
    <img
      className={className}
      src={makeIdentIconDataUrl(id)}
      alt=""
      title={name}
    />
  );
};
