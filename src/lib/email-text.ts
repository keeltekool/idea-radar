// Turns a newsletter text field (already HTML-escaped) into email-safe blocks:
// one line per row, "- " lines become bullets, "**x**" becomes bold.
const FONT = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif";

export function textToHtml(escaped: string): string {
  return escaped
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const html = line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#F9F8F6">$1</strong>');
      if (line.startsWith("- ")) {
        return `<p style="${FONT};font-size:15px;line-height:1.55;color:#D6D2CA;margin:0 0 10px;padding-left:16px;text-indent:-16px">&bull;&nbsp;&nbsp;${html.slice(2)}</p>`;
      }
      return `<p style="${FONT};font-size:15px;line-height:1.55;color:#D6D2CA;margin:0 0 10px">${html}</p>`;
    })
    .join("\n");
}

if (process.argv[1]?.endsWith("email-text.ts")) {
  const out = textToHtml("**Radar Atlas**: a canvas map\n- Why: 0 projects draw pixels\n\n1. Render dots");
  console.assert(out.split("<p ").length === 4, "three rows");
  console.assert(out.includes("<strong") && out.includes("&bull;"), "bold + bullet");
  console.log(out.split("<p ").length === 4 ? "ok" : "FAIL");
}
