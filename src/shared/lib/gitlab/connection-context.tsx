import { createContext, useContext, type ReactNode } from "react";
import type { GitLabConnection } from "./connection";

const GitLabConnectionContext = createContext<GitLabConnection | null>(null);

export const GitLabConnectionProvider = ({
  connection,
  children,
}: {
  connection: GitLabConnection | null;
  children: ReactNode;
}) => (
  <GitLabConnectionContext.Provider value={connection}>
    {children}
  </GitLabConnectionContext.Provider>
);

export const useGitLabConnection = () => useContext(GitLabConnectionContext);
