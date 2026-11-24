import { appStorage } from "./storage";

export const codeFontSizes = [12, 13, 14, 16, 18] as const;
export type CodeFontSize = typeof codeFontSizes[number];

export const codeFontSizeKey = appStorage.key<CodeFontSize>("code-font-size", 13);
export const wrapSourceCodeKey = appStorage.key("wrap-source-code", false);
