import type { GitlabProjectInfo } from "@/entities/gitlab-projects/model/gitlab-project-info";
import { cn } from "@/shared/lib/cn";
import { GitlabAvatar } from "@/shared/ui/gitlab-avatar/gitlab-avatar";

export const ProjectAvatar = ({
  project,
  className,
}: {
  project: GitlabProjectInfo;
  className: string;
}) => {
  if (project.data.avatar_url) {
    return (
      <GitlabAvatar
        className={className}
        avatarUrl={project.data.avatar_url}
        name={project.displayName}
      />
    );
  }

  return (
    <div
      className={cn(
        className,
        "grid place-items-center bg-gradient-to-br from-brand to-brand-gradient-to text-base font-bold text-white",
      )}
    >
      {project.displayName}
    </div>
  );
};
