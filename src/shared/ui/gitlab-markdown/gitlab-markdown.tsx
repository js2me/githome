import { withPropsViewModel } from "mobx-view-model";
import { cn } from "@/shared/lib/cn";
import { GitlabMarkdownVM } from "./model";
import "./styles.css";

export const GitLabMarkdown = withPropsViewModel(
  GitlabMarkdownVM,
  ({ model }) => {
    const { className, italic, text } = model.payload;
    const { html, hasError, hasScope, container } = model;

    if (!text.trim()) {
      return null;
    }

    if (!hasScope || hasError) {
      return (
        <div
          className={cn(
            "whitespace-pre-wrap break-words text-sm leading-relaxed",
            italic && "italic text-slate-500 dark:text-slate-400",
            className,
          )}
        >
          {text}
        </div>
      );
    }

    if (html === null) {
      return (
        <div
          className={cn(
            "animate-pulse rounded-md bg-slate-100 text-sm text-slate-400 dark:bg-slate-800",
            className,
          )}
        >
          &nbsp;
        </div>
      );
    }

    return (
      <div
        ref={container}
        className={cn(
          "gitlab-markdown min-w-0 max-w-full",
          italic && "italic text-slate-500 dark:text-slate-400",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  },
);
