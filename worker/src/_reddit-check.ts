// Temporary (Scrapyard plan task 7.1): run the real parseRss on every active Reddit feed, 1 s apart like the
// orchestrator, and print each result. Writes nothing. Delete after the check.
import { parseRss } from "./parsers/rss";

const subs = ["SideProject", "InternetIsBeautiful", "microsaas", "indiebiz", "startups", "AppIdeas", "buildinpublic", "EntrepreneurRideAlong", "imadethis"];
let ok = 0;
const t0 = Date.now();
for (const sub of subs) {
  const url = `https://www.reddit.com/r/${sub}/hot/.rss`;
  const r = await parseRss(url);
  if (!r.errors.length) ok++;
  console.log(`${Math.round((Date.now() - t0) / 1000)}s r/${sub}: ${r.errors.length ? r.errors[0] : `${r.discoveries.length} items`}`);
  await new Promise((res) => setTimeout(res, 1000));
}
console.log(`RESULT ${ok}/${subs.length} Reddit feeds OK in ${Math.round((Date.now() - t0) / 1000)}s`);
