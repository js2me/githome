export const lightSyntaxThemes = [
  { id: 'tokyo-night-light', label: 'Tokyo Night Light' },
  { id: 'github-light', label: 'GitHub Light' },
  { id: 'one-light', label: 'One Light' },
] as const;

export const darkSyntaxThemes = [
  { id: 'dracula-official', label: 'Dracula' },
  { id: 'github-dark', label: 'GitHub Dark' },
  { id: 'one-dark-pro', label: 'One Dark Pro' },
] as const;

export type LightSyntaxTheme = (typeof lightSyntaxThemes)[number]['id'];
export type DarkSyntaxTheme = (typeof darkSyntaxThemes)[number]['id'];
export type SyntaxTheme = LightSyntaxTheme | DarkSyntaxTheme;
