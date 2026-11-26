import type { LanguageRegistration } from 'shiki/core';

const escapeSequence = {
  match: String.raw`\\.`,
  name: 'constant.character.escape.gritql',
};

const metavariable = {
  match: String.raw`\$[a-zA-Z0-9_]+`,
  name: 'variable.parameter.gritql',
};

// Token forms follow https://github.com/biomejs/biome/blob/main/xtask/codegen/gritql.ungram
const gritql: LanguageRegistration = {
  name: 'gritql',
  scopeName: 'source.gritql',
  repository: {},
  patterns: [
    { match: '//.*', name: 'comment.line.double-slash.gritql' },
    { begin: '/\\*', end: '\\*/', name: 'comment.block.gritql' },
    {
      begin: String.raw`\br"`,
      end: '"|$',
      name: 'string.regexp.gritql',
      patterns: [escapeSequence],
    },
    {
      begin: '\\br`',
      end: '`',
      name: 'string.regexp.gritql',
      patterns: [escapeSequence, metavariable],
    },
    {
      begin: '\\braw`',
      end: '`',
      name: 'string.quoted.other.gritql',
      patterns: [escapeSequence],
    },
    {
      begin: '`',
      end: '`',
      name: 'string.quoted.other.gritql',
      patterns: [escapeSequence, metavariable],
    },
    {
      begin: '"',
      end: '"|$',
      name: 'string.quoted.double.gritql',
      patterns: [escapeSequence],
    },
    metavariable,
    {
      match: String.raw`\b(engine|language)\s+([a-zA-Z_][\w]*)`,
      captures: {
        1: { name: 'keyword.control.gritql' },
        2: { name: 'support.type.gritql' },
      },
    },
    {
      match: String.raw`\b(?:engine|language|private|pattern|predicate|function|return|sequential|multifile|as|limit|where|orelse|maybe|after|before|contains|until|includes|if|else|within|bubble|not|or|and|any|some|every|like)\b`,
      name: 'keyword.control.gritql',
    },
    {
      match: String.raw`\b(?:true|false|undefined|_)\b`,
      name: 'constant.language.gritql',
    },
    {
      match: String.raw`\b[0-9]+(?:\.[0-9]+)?\b`,
      name: 'constant.numeric.gritql',
    },
    {
      match: String.raw`\b[a-zA-Z_][\w]*(?=\s*\()`,
      name: 'entity.name.function.gritql',
    },
    {
      match: String.raw`=>|<:|==|!=|<=|>=|\+=|\.\.\.|[-+*/%!=<>]`,
      name: 'keyword.operator.gritql',
    },
  ],
};

export default [gritql];
