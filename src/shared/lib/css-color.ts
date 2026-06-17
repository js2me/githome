const syntaxColorFallbacks = {
  "--syntax-default": "#333333",
  "--syntax-comment": "#998877",
  "--syntax-string": "#d14",
  "--syntax-keyword": "#333333",
  "--syntax-type": "#445588",
  "--syntax-function": "#990000",
  "--syntax-number": "#009999",
  "--syntax-attr": "#008080",
  "--syntax-literal": "#0086b3",
} as const;

type SyntaxColorVar = keyof typeof syntaxColorFallbacks;

const colorCache = new Map<SyntaxColorVar, string>();

export const cssColor = (variable: SyntaxColorVar): string => {
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
