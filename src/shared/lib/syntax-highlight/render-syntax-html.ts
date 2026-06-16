import type { SyntaxToken } from "./shiki-highlighter";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const renderToken = (token: SyntaxToken) => {
  const styles: string[] = [];

  if (token.color) {
    styles.push(`color:${token.color}`);
  }

  if (token.fontStyle && token.fontStyle & 1) {
    styles.push("font-style:italic");
  }

  if (token.fontStyle && token.fontStyle & 2) {
    styles.push("font-weight:bold");
  }

  if (token.fontStyle && token.fontStyle & 4) {
    styles.push("text-decoration:underline");
  }

  const styleAttr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";
  return `<span${styleAttr}>${escapeHtml(token.content)}</span>`;
};

export const renderSyntaxTokensToHtml = (lines: SyntaxToken[][]) =>
  lines
    .map((line) => line.map(renderToken).join(""))
    .join("\n");
