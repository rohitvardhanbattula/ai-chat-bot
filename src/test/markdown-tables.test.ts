import { describe, it, expect } from "vitest";
import { parseMarkdownTables } from "@/lib/markdownTables";

describe("parseMarkdownTables", () => {
  it("parses a table, drops the separator row and unescapes pipes", () => {
    const md = "Intro\n\n| Area | Findings | Effort |\n| --- | --- | --- |\n| Z1 | Uses A \\| B | 2 PD |\n\nText";
    const [t] = parseMarkdownTables(md);
    expect(t.rows).toEqual([["Area", "Findings", "Effort"], ["Z1", "Uses A | B", "2 PD"]]);
  });
  it("handles several tables and ignores lone pipe lines", () => {
    const md = "| a | b |\n|---|---|\n| 1 | 2 |\n\ntext\n\n| c | d |\n|:--|--:|\n| 3 | 4 |\n\n| lonely |";
    expect(parseMarkdownTables(md)).toHaveLength(2);
  });
  it("returns nothing when there is no table", () => {
    expect(parseMarkdownTables("just text | with a pipe")).toEqual([]);
  });
});
