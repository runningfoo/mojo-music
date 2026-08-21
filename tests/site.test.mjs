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

test("dynamic content uses Worker APIs instead of legacy JSON files", async () => {
  const [site, worker] = await Promise.all([
    readFile(new URL("src/site.js", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
  ]);

  const endpoints = [
    "/api/shows",
    "/api/gallery",
    "/api/videos",
    "/api/music",
  ];

  for (const endpoint of endpoints) {
    assert.ok(
      site.includes(endpoint),
      `site.js should load ${endpoint}`
    );

    assert.ok(
      worker.includes(endpoint),
      `worker should expose ${endpoint}`
    );
  }

  assert.doesNotMatch(
    site,
    /\/data\/(?:shows|gallery|videos|music)\.json/
  );
});

test("booking form and API expose the required integration points", async () => {
  const [book, worker] = await Promise.all([
    readFile(new URL("book/index.html", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
  ]);
  for (const field of ["name", "email", "phone", "eventType", "eventDate", "location", "audience", "message"]) assert.match(book, new RegExp(`name="${field}"`));
  assert.match(worker, /\/api\/booking/);
  assert.match(worker, /env\.EMAIL\.send/);
  assert.match(worker, /booking@mojomusic\.org/);
  assert.doesNotMatch(worker, /RESEND_API_KEY|api\.resend\.com/);
});

test("Cloudflare Worker deployment is configured for the booking API and static site", async () => {
  const config = JSON.parse(await readFile(new URL("wrangler.jsonc", root), "utf8"));
  assert.equal(config.name, "mojo-music");
  assert.equal(config.main, "./worker/index.ts");
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.assets.not_found_handling, "single-page-application");
  assert.deepEqual(config.send_email, [{ name: "EMAIL", destination_address: "mojoduomusic@gmail.com" }]);
});
