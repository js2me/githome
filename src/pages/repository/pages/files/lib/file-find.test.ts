import { describe, expect, it } from 'vitest';
import { findMatches } from './file-find';

describe('file find', () => {
  it('matches punctuation literally and ignores case', () => {
    expect(
      findMatches('platformXset PLATFORM.set platform.set', 'platform.set'),
    ).toEqual({
      matches: [
        { start: 13, end: 25 },
        { start: 26, end: 38 },
      ],
      initialIndex: 0,
    });
  });

  it('starts at the first occurrence at or after the repository snippet', () => {
    const text = 'key\r\nblank\r\nKEY\r\nkey';
    expect(findMatches(text, 'key', 2).initialIndex).toBe(1);
    expect(findMatches(text, 'key', 4).initialIndex).toBe(2);
  });

  it('preserves text node offsets when Unicode case folding changes length', () => {
    expect(findMatches('İx', 'x').matches).toEqual([{ start: 1, end: 2 }]);
    expect(findMatches('blank', '   ').matches).toEqual([]);
  });
});
