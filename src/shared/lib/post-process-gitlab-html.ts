import { normalizeGitlabBaseUrl } from "@/shared/api/gitlab";

const isExternalUrl = (href: string) => /^https?:\/\//i.test(href);

export const postProcessGitLabHtml = (html: string, gitlabBaseUrl: string) => {
  if (!html.trim()) {
    return "";
  }

  const baseUrl = normalizeGitlabBaseUrl(gitlabBaseUrl);
  const document = new DOMParser().parseFromString(html, "text/html");

  for (const link of document.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href");
    if (!href) {
      continue;
    }

    if (href.startsWith("/")) {
      link.setAttribute("href", `${baseUrl}${href}`);
    }

    if (isExternalUrl(link.getAttribute("href") ?? "")) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  }

  for (const image of document.querySelectorAll("img[src]")) {
    const src = image.getAttribute("src");
    if (src?.startsWith("/")) {
      image.setAttribute("src", `${baseUrl}${src}`);
    }
  }

  return document.body.innerHTML;
};

export const sanitizeGitlabCodeBlocks = (html: string) => {
  if (!html.trim()) {
    return "";
  }

  const document = new DOMParser().parseFromString(html, "text/html");

  for (const pre of document.querySelectorAll("pre")) {
    for (const element of pre.querySelectorAll("[style]")) {
      element.removeAttribute("style");
    }

    pre.classList.add("gitlab-markdown-code-pre");
  }

  return document.body.innerHTML;
};
