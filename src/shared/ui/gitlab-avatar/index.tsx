import { withPropsViewModel } from "mobx-view-model";
import { cn } from "@/shared/lib/cn";
import { GitlabAvatarVM } from "./model";


export const GitlabAvatar = withPropsViewModel(GitlabAvatarVM, ({ model }) => {
  const { showImage, displaySrc, handleImageError } = model;
  const { className, name } = model.payload;

  if (showImage && displaySrc) {
    return (
      <img
        className={className}
        src={displaySrc}
        alt=""
        title={name}
        onError={handleImageError}
      />
    );
  }

  return <div
    className={cn(
      "grid place-items-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300",
      className,
    )}
    title={name}
  >
    {name.slice(0, 1).toUpperCase()}
  </div>;
}
);
