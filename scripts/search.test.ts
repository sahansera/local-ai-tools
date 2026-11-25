import assert from "node:assert/strict";
import test from "node:test";
import {
  createSearchIndex,
  searchScores,
  tokenize,
} from "../apps/web/public/search.js";

const index = createSearchIndex([
  {
    name: "FFmpeg",
    categories: ["video"],
    tags: [],
    description: "Convert clips",
    author: "a",
  },
  {
    name: "Video editor",
    categories: [],
    tags: [],
    description: "Creative tools",
    author: "b",
  },
  {
    name: "Notes",
    categories: [],
    tags: [],
    description: "Read PDF documents, memory and persistence",
    author: "c",
  },
  {
    name: "Web search",
    categories: [],
    tags: [],
    description: "Search the internet",
    author: "d",
  },
]);

test("tokenization handles case, accents and punctuation", () => {
  assert.deepEqual(tokenize("VIDÉO-editing/PDF"), ["video", "editing", "pdf"]);
});
test("capability phrases and synonyms find relevant tools", () => {
  assert.ok(searchScores(index, "edit videos")!.has(0));
  assert.ok(searchScores(index, "remember conversations")!.has(2));
  assert.ok(searchScores(index, "read my documents")!.has(2));
  assert.ok(searchScores(index, "search the internet")!.has(3));
});
test("exact title matches outrank category matches and fuzzy matches", () => {
  const scores = searchScores(index, "video")!;
  assert.ok(scores.get(1)! > scores.get(0)!);
  assert.ok(searchScores(index, "vidoe")!.has(1));
  assert.ok(searchScores(index, "documnts")!.has(2));
});
test("all meaningful query terms must match; empty and stopword queries are unrestricted", () => {
  assert.equal(searchScores(index, "video database")!.size, 0);
  assert.equal(searchScores(index, "the tools"), null);
  assert.equal(searchScores(index, ""), null);
});
