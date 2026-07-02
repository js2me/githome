import { colorScheme } from "mobx-web-api";
import type { SyntaxTheme } from "./shiki-highlighter";

export const getSyntaxTheme = (): SyntaxTheme =>
  colorScheme.isDark ? "github-dark" : "github-light";
