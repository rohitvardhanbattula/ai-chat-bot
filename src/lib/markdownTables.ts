/** Extract pipe-delimited (Markdown) tables from a model reply so they can be exported to Excel. */

export type ParsedTable = { rows: string[][] };

const SEPARATOR_CELL = /^:?-{2,}:?$/;

/** Split one table line on unescaped pipes: "| a | b \| c |" -> ["a", "b | c"]. */
function splitRow(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\\" && line[i + 1] === "|") { cur += "|"; i++; }
    else if (ch === "|") { cells.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  cells.push(cur.trim());
  if (cells[0] === "") cells.shift();                       // leading pipe
  if (cells.length && cells[cells.length - 1] === "") cells.pop(); // trailing pipe
  return cells;
}

const isSeparator = (cells: string[]) => cells.length > 0 && cells.every(c => SEPARATOR_CELL.test(c));

/** A table = 2+ consecutive lines starting with "|" (code fences are ignored, so tables inside them still count). */
export function parseMarkdownTables(markdown: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  let block: string[] = [];

  const flush = () => {
    if (block.length >= 2) {
      const rows = block.map(splitRow).filter(r => !isSeparator(r));
      if (rows.length >= 2 && rows[0].length >= 2) tables.push({ rows });
    }
    block = [];
  };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("|")) block.push(line);
    else flush();
  }
  flush();
  return tables;
}
