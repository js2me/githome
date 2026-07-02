import { colorScheme } from "mobx-web-api";
import type { SyntaxTheme } from "./syntax-highlighter";

export const getSyntaxTheme = (): SyntaxTheme =>
  colorScheme.isDark ? "github-dark" : "github-light";
