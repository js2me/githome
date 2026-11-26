import { describe, expect, it } from 'vitest';
import { SyntaxHighlighter } from './syntax-highlighter';
import { darkSyntaxThemes, lightSyntaxThemes } from './theme-options';

const source = 'export const highlightLabel = "visible";';

describe('code color schemes', () => {
  const highlighter = new SyntaxHighlighter();

  for (const options of [lightSyntaxThemes, darkSyntaxThemes]) {
    it(`highlights code with each ${options[0].label} alternative`, async () => {
      const palettes = new Set<string>();
      for (const { id } of options) {
        const tokens = (
          await highlighter.highlightCodeBlockTokens(source, 'typescript', id)
        ).flat();
        expect(tokens.map(({ content }) => content).join('')).toBe(source);

        const palette = new Set(
          tokens.map(({ color }) => color).filter(Boolean),
        );
        expect(palette.size).toBeGreaterThan(1);
        palettes.add([...palette].join(','));
      }
      expect(palettes.size).toBe(options.length);
    });
  }
});
