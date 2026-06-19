import type { GitlabProjectInfo } from "@/entities/gitlab-projects/model/gitlab-project-info";
import { cn } from "@/shared/lib/cn";

export const ProjectAvatar = ({
  project,
  className,
}: {
  project: GitlabProjectInfo;
  className: string;
}) => {
  if (project.data.avatar_url) {
    return (
      <img className={className} src={project.data.avatar_url} alt="" />
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
