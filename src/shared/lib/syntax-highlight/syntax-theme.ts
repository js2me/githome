import { globals } from "@/globals";
import type { SyntaxTheme } from "./syntax-highlighter";

export const getSyntaxTheme = (): SyntaxTheme =>
  globals.stores.theme.isDark ? "dracula-official" : "tokyo-night-light";
