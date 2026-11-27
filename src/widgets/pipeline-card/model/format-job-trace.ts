// GitLab Runner prints terminal sequences and section markers alongside the text.
const terminalSequences =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Match ANSI control sequences emitted by GitLab Runner.
  /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\[[0-?]*[ -/]*[@-~]/g;
const sectionMarker =
  /(?<=^|\r|\n)section_(?:start|end):\d+:[\w.-]+(?:\[[^\]\r\n]*\])?\r/g;

export const formatJobTrace = (trace: string) =>
  trace
    .replace(terminalSequences, '')
    .replace(sectionMarker, '')
    .replace(/\r\n?/g, '\n');
