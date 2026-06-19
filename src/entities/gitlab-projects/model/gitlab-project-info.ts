import { computed } from "mobx";
import type { GitLabProjectDC } from "@/shared/api/gitlab";

export class GitlabProjectInfo {
  constructor(readonly data: GitLabProjectDC) {}

  @computed
  get name() {
    return this.data.name;
  }

  @computed
  get displayName() {
    const name = this.name.trim();

    return name ? name.slice(0, 1).toUpperCase() : "?";
  }
}
