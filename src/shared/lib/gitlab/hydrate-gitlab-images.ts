import {
  buildGitlabRequestHeaders,
  isGitlabProxiedAssetUrl,
} from "@/shared/api/gitlab";
import type { GitLabConnection } from "@/shared/lib/gitlab/connection";

export const hydrateProxiedGitlabImages = (
  root: HTMLElement,
  connection: GitLabConnection,
) => {
  const controllers: AbortController[] = [];
  const objectUrls: string[] = [];

  for (const image of root.querySelectorAll("img[src]")) {
    const src = image.getAttribute("src");
    if (!src || !isGitlabProxiedAssetUrl(src)) {
      continue;
    }

    const controller = new AbortController();
    controllers.push(controller);

    void fetch(src, {
      headers: buildGitlabRequestHeaders(connection.gitlabUrl, {
        "PRIVATE-TOKEN": connection.gitToken,
      }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(String(response.status));
        }

        return response.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        objectUrls.push(objectUrl);
        image.setAttribute("src", objectUrl);
      })
      .catch(() => {});
  }

  return () => {
    for (const controller of controllers) {
      controller.abort();
    }

    for (const objectUrl of objectUrls) {
      URL.revokeObjectURL(objectUrl);
    }
  };
};
