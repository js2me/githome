export interface FileSearchTarget {
  query: string;
  startLine: number;
}

export function findMatches(text: string, query: string, startLine = 1) {
  const matches: Array<{ start: number; end: number }> = [];
  let initialIndex = 0;
  if (!query.trim()) return { matches, initialIndex };

  let lineStart = 0;
  for (let line = 1; line < startLine; line++) {
    const newline = text.indexOf('\n', lineStart);
    if (newline < 0) break;
    lineStart = newline + 1;
  }

  const pattern = new RegExp(
    query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'giu',
  );
  for (const match of text.matchAll(pattern)) {
    matches.push({ start: match.index, end: match.index + match[0].length });
  }

  const index = matches.findIndex((match) => match.start >= lineStart);
  if (index >= 0) initialIndex = index;
  else if (matches.length) initialIndex = matches.length - 1;

  return { matches, initialIndex };
}

export function indexFileText(root: HTMLElement, isMarkdown: boolean) {
  const content = isMarkdown ? root : root.querySelector('pre');
  if (!content) return null;

  const blocks = 'p,li,td,th,pre,blockquote,h1,h2,h3,h4,h5,h6';
  const walker = root.ownerDocument.createTreeWalker(
    content,
    NodeFilter.SHOW_TEXT,
  );
  const nodes: Array<{ text: Text; offset: number }> = [];
  const chunks: string[] = [];
  let length = 0;
  let block: Element | null | undefined;

  for (let next = walker.nextNode(); next; next = walker.nextNode()) {
    const text = next as Text;
    if (!text.length) continue;
    if (isMarkdown) {
      const parent = text.parentElement?.closest(blocks);
      if (nodes.length && parent !== block) {
        chunks.push('\n');
        length++;
      }
      block = parent;
    }
    nodes.push({ text, offset: length });
    chunks.push(text.data);
    length += text.length;
  }

  return { nodes, text: chunks.join(''), document: root.ownerDocument };
}

export function findTextRanges(
  content: NonNullable<ReturnType<typeof indexFileText>>,
  query: string,
  startLine: number,
) {
  const { nodes, text } = content;
  const { matches, initialIndex } = findMatches(text, query, startLine);
  let nodeIndex = 0;
  const seek = (position: number, includeEnd: boolean) => {
    while (nodeIndex + 1 < nodes.length) {
      const { offset, text } = nodes[nodeIndex];
      const end = offset + text.length;
      if (position < end || (position === end && includeEnd)) break;
      nodeIndex++;
    }
    const { offset, text } = nodes[nodeIndex];
    return [text, position - offset] as const;
  };

  const ranges = matches.map(({ start, end }) => {
    const range = content.document.createRange();
    range.setStart(...seek(start, false));
    range.setEnd(...seek(end, true));
    return range;
  });

  return { ranges, initialIndex };
}

export function scrollToMatch(range: Range) {
  const scrollingElement = document.scrollingElement;
  let parent = range.startContainer.parentElement;
  while (parent && parent !== scrollingElement) {
    const { overflowX, overflowY } = getComputedStyle(parent);
    const scrollX =
      /auto|scroll/.test(overflowX) && parent.scrollWidth > parent.clientWidth;
    const scrollY =
      /auto|scroll/.test(overflowY) &&
      parent.scrollHeight > parent.clientHeight;
    if (scrollX || scrollY) {
      const match = range.getBoundingClientRect();
      const box = parent.getBoundingClientRect();
      if (scrollX && (match.left < box.left || match.right > box.right)) {
        parent.scrollLeft += match.left - box.left - parent.clientWidth / 4;
      }
      if (scrollY && (match.top < box.top || match.bottom > box.bottom)) {
        parent.scrollTop += match.top - box.top - parent.clientHeight / 2;
      }
    }
    parent = parent.parentElement;
  }

  const rect = range.getBoundingClientRect();
  window.scrollBy({
    top:
      rect.top < 85 || rect.bottom > window.innerHeight - 24
        ? rect.top - window.innerHeight / 2
        : 0,
    left:
      rect.left < 0 || rect.right > window.innerWidth
        ? rect.left - window.innerWidth / 4
        : 0,
    behavior: 'instant',
  });
}
