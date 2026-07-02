export interface MarkdownSelection {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface MarkdownSelectionResult extends MarkdownSelection {}

const getBlockLineRange = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
) => {
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineEndIndex = value.indexOf("\n", selectionEnd);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;

  return { lineStart, lineEnd };
};

export const wrapMarkdownSelection = (
  input: MarkdownSelection,
  before: string,
  after: string,
  placeholder = "text",
): MarkdownSelectionResult => {
  const { value, selectionStart, selectionEnd } = input;
  const selected = value.slice(selectionStart, selectionEnd);
  const text = selected || placeholder;
  const nextValue =
    value.slice(0, selectionStart) +
    before +
    text +
    after +
    value.slice(selectionEnd);

  const nextSelectionStart = selectionStart + before.length;
  const nextSelectionEnd = nextSelectionStart + text.length;

  return {
    value: nextValue,
    selectionStart: nextSelectionStart,
    selectionEnd: nextSelectionEnd,
  };
};

export const insertMarkdownAtSelection = (
  input: MarkdownSelection,
  insert: string,
): MarkdownSelectionResult => {
  const { value, selectionStart, selectionEnd } = input;
  const nextValue =
    value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
  const cursor = selectionStart + insert.length;

  return {
    value: nextValue,
    selectionStart: cursor,
    selectionEnd: cursor,
  };
};

export const prefixMarkdownLines = (
  input: MarkdownSelection,
  prefix: string,
): MarkdownSelectionResult => {
  const { value, selectionStart, selectionEnd } = input;
  const { lineStart, lineEnd } = getBlockLineRange(
    value,
    selectionStart,
    selectionEnd,
  );
  const block = value.slice(lineStart, lineEnd);
  const prefixed = block
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
  const nextValue = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);

  return {
    value: nextValue,
    selectionStart: lineStart,
    selectionEnd: lineStart + prefixed.length,
  };
};

export const insertMarkdownLink = (
  input: MarkdownSelection,
): MarkdownSelectionResult => {
  const selected = input.value.slice(
    input.selectionStart,
    input.selectionEnd,
  );
  const label = selected || "text";
  const insert = `[${label}](url)`;
  const urlStart = input.selectionStart + label.length + 3;
  const urlEnd = urlStart + 3;

  return {
    value:
      input.value.slice(0, input.selectionStart) +
      insert +
      input.value.slice(input.selectionEnd),
    selectionStart: urlStart,
    selectionEnd: urlEnd,
  };
};

export const insertMarkdownCode = (
  input: MarkdownSelection,
): MarkdownSelectionResult => {
  const selected = input.value.slice(
    input.selectionStart,
    input.selectionEnd,
  );

  if (selected.includes("\n")) {
    return wrapMarkdownSelection(input, "```\n", "\n```", "code");
  }

  return wrapMarkdownSelection(input, "`", "`", "code");
};
