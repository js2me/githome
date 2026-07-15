import { reaction } from "mobx";
import type { Globals } from "@/globals";

export const FILES_QUERY_KEYS = {
  branch: "branch",
  commit: "commit",
  file: "file",
} as const;

export type FilesQueryData = {
  branch: string | null;
  commit: string | null;
  file: string | null;
};

type FilesQueryState = FilesQueryData;

export class FilesPageQuerySync {
  private syncingFromQuery = false;

  constructor(
    private readonly globals: Globals,
    private readonly getState: () => FilesQueryState,
    private readonly applyState: (data: FilesQueryData) => void,
  ) {
    reaction(
      () => ({
        isOpen: globals.routes.files.isOpened,
        query: this.readQuery(),
      }),
      ({ isOpen, query }) => {
        if (!isOpen) {
          return;
        }

        this.syncingFromQuery = true;
        try {
          this.applyState(query);
        } finally {
          this.syncingFromQuery = false;
        }
      },
      { fireImmediately: true },
    );

    reaction(
      () => ({
        isOpen: globals.routes.files.isOpened,
        state: this.getState(),
      }),
      ({ isOpen, state }) => {
        if (!isOpen || this.syncingFromQuery) {
          return;
        }

        this.writeQuery(state);
      },
    );
  }

  readQuery(): FilesQueryData {
    const data = this.globals.query.data;

    return {
      branch: data[FILES_QUERY_KEYS.branch]?.trim() || null,
      commit: data[FILES_QUERY_KEYS.commit]?.trim() || null,
      file: data[FILES_QUERY_KEYS.file]?.trim() || null,
    };
  }

  private writeQuery(state: FilesQueryState) {
    const current = this.readQuery();

    if (
      current.branch === state.branch &&
      current.commit === state.commit &&
      current.file === state.file
    ) {
      return;
    }

    this.globals.query.update(
      {
        [FILES_QUERY_KEYS.branch]: state.branch,
        [FILES_QUERY_KEYS.commit]: state.commit,
        [FILES_QUERY_KEYS.file]: state.file,
      },
      { replace: true },
    );
  }
}
