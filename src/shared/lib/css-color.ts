const syntaxColorFallbacks = {
  "--syntax-default": "#343b58",
  "--syntax-comment": "#6c6e75",
  "--syntax-string": "#385f0d",
  "--syntax-keyword": "#8c4351",
  "--syntax-type": "#006c86",
  "--syntax-function": "#2959aa",
  "--syntax-number": "#965027",
  "--syntax-attr": "#5a3e8e",
  "--syntax-literal": "#0f4b6e",
} as const;

type SyntaxColorVar = keyof typeof syntaxColorFallbacks;

const colorCache = new Map<SyntaxColorVar, string>();
let colorCacheThemeKey = "";

const getColorCacheThemeKey = () => {
  if (typeof document === "undefined") {
    return "";
  }

  return getComputedStyle(document.documentElement)
    .getPropertyValue("--syntax-default")
    .trim();
};

export const cssColor = (variable: SyntaxColorVar): string => {
  const themeKey = getColorCacheThemeKey();
  if (themeKey !== colorCacheThemeKey) {
    colorCache.clear();
    colorCacheThemeKey = themeKey;
  }

  const cached = colorCache.get(variable);
  if (cached) {
    return cached;
  }

  const value =
    typeof document !== "undefined"
      ? getComputedStyle(document.documentElement)
          .getPropertyValue(variable)
          .trim()
      : "";

  const resolved = value || syntaxColorFallbacks[variable];
  colorCache.set(variable, resolved);
  return resolved;
};
