import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const pages = ["index.html", "about/index.html", "music/index.html", "shows/index.html", "gallery/index.html", "book/index.html"];

test("all primary pages have core metadata and a single h1", async () => {
  const documents = await Promise.all(pages.map((page) => readFile(new URL(page, root), "utf8")));
  for (const html of documents) {
    assert.match(html, /<title>.+<\/title>/);
    assert.match(html, /<meta name="description"/);
    assert.match(html, /<link rel="canonical"/);
    assert.match(html, /<meta property="og:image"/);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
    assert.match(html, /href="\/book\/"/);
  }
  assert.equal(new Set(documents.map((html) => html.match(/<title>(.+)<\/title>/)?.[1])).size, pages.length);
});

test("show data is sorted and contains September and October 2026 dates", async () => {
  const shows = JSON.parse(await readFile(new URL("public/data/shows.json", root), "utf8"));
  const dates = shows.map((show) => show.date);
  assert.deepEqual(dates, [...dates].sort());
  assert.ok(dates.some((date) => date.startsWith("2026-09")));
  assert.ok(dates.some((date) => date.startsWith("2026-10")));
  assert.ok(shows.every((show) => ["public", "private"].includes(show.type)));
});

test("booking form and API expose the required integration points", async () => {
  const [book, worker] = await Promise.all([
    readFile(new URL("book/index.html", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
  ]);
  for (const field of ["name", "email", "phone", "eventType", "eventDate", "location", "audience", "message"]) assert.match(book, new RegExp(`name="${field}"`));
  assert.match(worker, /\/api\/booking/);
  assert.match(worker, /RESEND_API_KEY/);
  assert.match(worker, /BOOKING_EMAIL/);
});
