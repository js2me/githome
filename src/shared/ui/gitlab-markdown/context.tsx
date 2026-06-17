import { createContext, useContext } from "react";
import type { GitLabConnection } from "@/shared/lib/gitlab/connection";

export interface GitLabMarkdownContextValue {
  connection: GitLabConnection;
  projectPath: string;
}

export const GitLabMarkdownContext =
  createContext<GitLabMarkdownContextValue | null>(null);

export const useGitLabMarkdownContext = () =>
  useContext(GitLabMarkdownContext);
