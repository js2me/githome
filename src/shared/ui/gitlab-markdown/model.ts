import { action, observable, reaction, runInAction } from "mobx";
import { colorScheme } from "mobx-web-api";
import { ViewModelBase } from "mobx-view-model";
import { createRef } from "yummies/mobx";
import { gitlabApi } from "@/shared/api/gitlab";
import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { hydrateProxiedGitlabImages } from "@/shared/lib/gitlab/hydrate-gitlab-images";
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
import { getSyntaxTheme } from "@/shared/lib/syntax-highlight/syntax-theme";

export interface GitlabMarkdownScope {
  connection: GitLabConnection | null;
  projectPath: string;
  projectId: number;
}

export interface GitlabMarkdownPayload extends GitlabMarkdownScope {
  text: string;
  className?: string;
  italic?: boolean;
}

export class GitlabMarkdownVM extends ViewModelBase<GitlabMarkdownPayload> {
  @observable accessor html: string | null = null;
  @observable accessor hasError = false;

  readonly container = createRef<HTMLDivElement>();

  get hasScope(): boolean {
    const { connection, projectPath, projectId } = this.payload;
    return Boolean(connection && projectPath && projectId);
  }

  private get cacheKey(): string | null {
    if (!this.hasScope || !this.payload.text.trim()) {
      return null;
    }

    return getGitLabMarkdownCacheKey(
      this.payload.connection!.id,
      this.payload.projectPath,
      this.payload.text,
    );
  }

  willMount() {
    reaction(
      () => ({
        text: this.payload.text,
        hasScope: this.hasScope,
        cacheKey: this.cacheKey,
      }),
      () => {
        this.syncFromCacheOrFetch();
      },
      { fireImmediately: true },
    );

    reaction(
      () => ({
        html: this.html,
        hasScope: this.hasScope,
        connection: this.payload.connection,
        isDark: colorScheme.isDark,
        container: this.container.current,
      }),
      () => {
        const container = this.container.current;
        const connection = this.payload.connection;
        const html = this.html;

        if (!html || !container || !this.hasScope || !connection) {
          return;
        }

        let cancelled = false;
        const signal = this.unmountSignal;
        const theme = getSyntaxTheme();
        let cleanupImages: (() => void) | undefined;

        const frame = requestAnimationFrame(() => {
          if (
            signal.aborted ||
            this.container.current !== container ||
            this.html !== html
          ) {
            return;
          }

          void enhanceMarkdownCodeBlocks(container, theme).catch(() => {
            if (
              !cancelled &&
              !signal.aborted &&
              this.container.current === container
            ) {
              for (const pre of container.querySelectorAll("pre")) {
                pre.classList.add("gitlab-markdown-plain-code");
              }
            }
          });

          cleanupImages = hydrateProxiedGitlabImages(container, connection);
        });

        return () => {
          cancelled = true;
          cancelAnimationFrame(frame);
          cleanupImages?.();
        };
      },
      { fireImmediately: true },
    );
  }

  @action.bound
  private syncFromCacheOrFetch() {
    const text = this.payload.text;

    if (!text.trim()) {
      this.html = "";
      this.hasError = false;
      return;
    }

    if (!this.hasScope) {
      this.html = null;
      this.hasError = false;
      return;
    }

    const cacheKey = this.cacheKey!;
    const cached = getCachedGitLabMarkdown(cacheKey);

    if (cached) {
      this.html = cached;
      this.hasError = false;
      return;
    }

    this.html = null;
    this.hasError = false;
    void this.fetchMarkdown(cacheKey);
  }

  private async fetchMarkdown(cacheKey: string) {
    const { connection, projectPath, text } = this.payload;
    if (!connection) {
      return;
    }

    const requestText = text;
    const signal = this.unmountSignal;

    try {
      const renderedHtml = await gitlabApi.renderMarkdown(connection, {
        text: requestText,
        projectPath,
      });

      if (signal.aborted || requestText !== this.payload.text) {
        return;
      }

      const processedHtml = sanitizeGitlabCodeBlocks(
        postProcessGitLabHtml(renderedHtml, connection),
      );

      runInAction(() => {
        if (requestText !== this.payload.text) {
          return;
        }

        setCachedGitLabMarkdown(cacheKey, processedHtml);
        this.html = processedHtml;
        this.hasError = false;
      });
    } catch {
      if (signal.aborted || requestText !== this.payload.text) {
        return;
      }

      runInAction(() => {
        if (requestText !== this.payload.text) {
          return;
        }

        this.hasError = true;
      });
    }
  }
}
