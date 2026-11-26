import { describe, expect, it } from 'vitest';
import { parseUnifiedDiff } from '../../diff/parse-unified-diff';
import { DiffSyntaxHighlight } from '../diff-syntax-highlight';
import { syntaxHighlighter } from '../syntax-highlighter';
import { getLanguageFromPath } from './language-from-path';
import { resolveSyntaxLanguage } from './supported-languages';

const source = [
  'language js',
  'pattern rename($value) {',
  '  `oldName($value)` => `newName($value)` where $value <: r"\\w+"',
  '  // a GritQL comment',
  '}',
];

describe('GritQL highlighting', () => {
  it('detects .grit files and resolves both language names', () => {
    expect(getLanguageFromPath('patterns/rename.grit')).toBe('gritql');
    expect(getLanguageFromPath('patterns/rename.GRIT')).toBe('gritql');
    expect(resolveSyntaxLanguage('grit')).toBe('gritql');
    expect(resolveSyntaxLanguage('gritql')).toBe('gritql');
  });

  it.each(['dracula-official', 'tokyo-night-light'] as const)(
    'highlights GritQL in the file viewer using %s',
    async (theme) => {
      const language = getLanguageFromPath('patterns/rename.grit');
      if (!language) throw new Error('Expected a language for .grit');

      const lines = await syntaxHighlighter.highlightCodeBlockTokens(
        source.join('\n'),
        language,
        theme,
      );

      expect(
        lines.map((line) => line.map(({ content }) => content).join('')),
      ).toEqual(source);
      const colorOf = (line: number, text: string) =>
        lines[line].find(({ content }) => content.includes(text))?.color;
      const plain = colorOf(1, ' {');
      expect(plain).toBeDefined();
      for (const [line, text] of [
        [0, 'language'],
        [1, 'pattern'],
        [2, 'oldName'],
        [2, '$value'],
        [2, '<:'],
        [2, 'r"'],
        [3, '// a GritQL comment'],
      ] as const) {
        const color = colorOf(line, text);
        expect(color, text).toBeDefined();
        expect(color, text).not.toBe(plain);
      }
      expect(colorOf(2, '$value')).not.toBe(colorOf(2, 'oldName'));
    },
  );

  it('highlights removed and added GritQL diff lines', async () => {
    const { language } = new DiffSyntaxHighlight('new.grit', 'old.grit');
    if (!language) throw new Error('Expected a language for .grit');

    const parsed = parseUnifiedDiff(
      '@@ -1,2 +1,2 @@\n language js\n-predicate before_name($x) { $x <: `old` }\n+predicate after_name($x) { $x <: `new` }',
    );
    const tokens = await syntaxHighlighter.highlightParsedDiffLines(
      parsed,
      language,
      'dracula-official',
    );

    for (const key of ['old:2', 'new:2']) {
      const line = tokens.get(key);
      expect(line?.[0]).toMatchObject({
        content: 'predicate',
        color: expect.any(String),
      });
      expect(new Set(line?.map(({ color }) => color)).size).toBeGreaterThan(1);
    }
  });
});
