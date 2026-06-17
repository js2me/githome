import { memo, useEffect, useRef, useState } from "react";
import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabApi } from "@/shared/api/gitlab";
import {
  getCachedGitLabMarkdown,
  getGitLabMarkdownCacheKey,
  setCachedGitLabMarkdown,
} from "@/shared/lib/gitlab/markdown-cache";
import {
  postProcessGitLabHtml,
  sanitizeGitlabCodeBlocks,
} from "@/shared/lib/gitlab/post-process-html";
import { enhanceMarkdownCodeBlocks } from "@/shared/lib/syntax-highlight/enhance-markdown-code-blocks";
import { useSyntaxTheme } from "@/shared/lib/syntax-highlight/use-syntax-theme";
import { cn } from "@/shared/lib/cn";
import { GitLabMarkdownContext, useGitLabMarkdownContext } from "./context";
import "./gitlab-markdown.css";

export const GitLabMarkdownProvider = ({
  connection,
  projectPath,
  children,
}: {
  connection: GitLabConnection | null;
  projectPath: string;
  children: React.ReactNode;
}) => {
  if (!connection || !projectPath) {
    return children;
  }

  return (
    <GitLabMarkdownContext.Provider value={{ connection, projectPath }}>
      {children}
    </GitLabMarkdownContext.Provider>
  );
};

const PlainMarkdownFallback = ({
  text,
  className,
  italic,
}: {
  text: string;
  className?: string;
  italic?: boolean;
}) => (
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

export const GitLabMarkdown = memo(
  ({
    text,
    className,
    italic,
  }: {
    text: string;
    className?: string;
    italic?: boolean;
  }) => {
    const context = useGitLabMarkdownContext();
    const theme = useSyntaxTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const [html, setHtml] = useState<string | null>(() => {
      if (!context || !text.trim()) {
        return text.trim() ? null : "";
      }

      const cacheKey = getGitLabMarkdownCacheKey(
        context.connection.id,
        context.projectPath,
        text,
      );

      return getCachedGitLabMarkdown(cacheKey) ?? null;
    });
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
      if (!text.trim()) {
        setHtml("");
        setHasError(false);
        return;
      }

      if (!context) {
        setHtml(null);
        setHasError(false);
        return;
      }

      const cacheKey = getGitLabMarkdownCacheKey(
        context.connection.id,
        context.projectPath,
        text,
      );
      const cached = getCachedGitLabMarkdown(cacheKey);

      if (cached) {
        setHtml(cached);
        setHasError(false);
        return;
      }

      let cancelled = false;
      setHtml(null);
      setHasError(false);

      void gitlabApi
        .renderMarkdown(context.connection, {
          text,
          projectPath: context.projectPath,
        })
        .then((renderedHtml) => {
          if (cancelled) {
            return;
          }

          const processedHtml = sanitizeGitlabCodeBlocks(
            postProcessGitLabHtml(renderedHtml, context.connection.gitlabUrl),
          );
          setCachedGitLabMarkdown(cacheKey, processedHtml);
          setHtml(processedHtml);
        })
        .catch(() => {
          if (!cancelled) {
            setHasError(true);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [context, text]);

    useEffect(() => {
      if (!html || !containerRef.current) {
        return;
      }

      let cancelled = false;

      void enhanceMarkdownCodeBlocks(containerRef.current, theme).catch(() => {
        if (!cancelled && containerRef.current) {
          for (const pre of containerRef.current.querySelectorAll("pre")) {
            pre.classList.add("gitlab-markdown-plain-code");
          }
        }
      });

      return () => {
        cancelled = true;
      };
    }, [html, theme]);

    if (!text.trim()) {
      return null;
    }

    if (!context || hasError) {
      return (
        <PlainMarkdownFallback text={text} className={className} italic={italic} />
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
        ref={containerRef}
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
