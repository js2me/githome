import { appStorage } from './storage';
import {
  darkSyntaxThemes,
  lightSyntaxThemes,
} from './syntax-highlight/rendering/theme-options';

export const codeFontSizes = [12, 13, 14, 16, 18] as const;
export type CodeFontSize = (typeof codeFontSizes)[number];

export const codeFontSizeKey = appStorage.key<CodeFontSize>(
  'code-font-size',
  13,
);
export const wrapSourceCodeKey = appStorage.key('wrap-source-code', false);

export const codeSyntaxThemeSettings = {
  light: {
    options: lightSyntaxThemes,
    key: appStorage.key<string>(
      'code-syntax-theme-light',
      lightSyntaxThemes[0].id,
    ),
  },
  dark: {
    options: darkSyntaxThemes,
    key: appStorage.key<string>(
      'code-syntax-theme-dark',
      darkSyntaxThemes[0].id,
    ),
  },
};

export type CodeColorMode = keyof typeof codeSyntaxThemeSettings;

export const getCodeSyntaxTheme = (mode: CodeColorMode) => {
  const { key, options } = codeSyntaxThemeSettings[mode];
  return options.find(({ id }) => id === key.value)?.id ?? options[0].id;
};
