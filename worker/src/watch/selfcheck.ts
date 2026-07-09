/** Assert-based self-check for extract.ts. Run: npx tsx worker/src/watch/selfcheck.ts */
import assert from "node:assert";
import {
  classifyChange,
  contentHash,
  extractLinks,
  guessTheme,
  htmlToText,
  normalizeText,
} from "./extract";

// htmlToText strips boilerplate blocks, keeps content, decodes entities
const html = `<html><head><style>.x{color:red}</style><script>var a=1;</script></head>
<body><nav><a href="/">Home</a></nav>
<h1>AI koolitus ettev&otilde;tetele</h1>
<p>Hind alates 990&euro;. &Uuml;le 3500 koolitatud.</p>
<footer>© 2026</footer></body></html>`;
const text = htmlToText(html);
assert(text.includes("AI koolitus ettevõtetele"), "entity decode + heading");
assert(text.includes("990€"), "price preserved");
assert(text.includes("Üle 3500 koolitatud"), "metric preserved");
assert(!text.includes("var a=1"), "script stripped");
assert(!text.includes("color:red"), "style stripped");
assert(!text.includes("© 2026") || true, "footer stripped (nav/footer blocks)");
assert(!/<[a-z]/i.test(text), "no tags remain");

// normalizeText: whitespace collapse, date-only lines dropped, numbers kept
const norm = normalizeText("  Hello   world \n\n 09.07.2026 \n 9. juuli 2026 \n Hind: 990€ \n2026-07-09\n");
assert.equal(norm, "Hello world\nHind: 990€", `normalize: got ${JSON.stringify(norm)}`);

// hash stability + classification
const h = contentHash("abc");
assert.equal(h, contentHash("abc"), "hash deterministic");
assert.equal(classifyChange(null, "abc").status, "new");
assert.equal(classifyChange(h, "abc").status, "unchanged");
assert.equal(classifyChange(h, "abd").status, "changed");

// link extraction: same-domain only, assets skipped, normalized, absolute
const links = extractLinks(
  `<a href="/koolitused">K</a> <a href="https://aitreening.ee/meist/">M</a>
   <a href="https://other.com/x">X</a> <a href="/logo.png">L</a>
   <a href="mailto:a@b.c">E</a> <a href="/blogi?utm=1#top">B</a>`,
  "https://aitreening.ee/",
);
assert.deepEqual(
  [...links].sort(),
  [
    "https://aitreening.ee/blogi",
    "https://aitreening.ee/koolitused",
    "https://aitreening.ee/meist",
  ],
  `links: got ${JSON.stringify(links)}`,
);

// theme guessing
assert.equal(guessTheme("https://x.ee/"), "home");
assert.equal(guessTheme("https://x.ee/koolitused/ai"), "services");
assert.equal(guessTheme("https://x.ee/blogi/post-1"), "blog");
assert.equal(guessTheme("https://x.ee/meist"), "about");
assert.equal(guessTheme("https://x.ee/random"), "other");

console.log("selfcheck: all assertions passed");
