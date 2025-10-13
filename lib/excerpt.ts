// Turn HTML into plain text and make a short excerpt
export function stripHtml(html: string | null | undefined) {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function makeExcerptFromHtml(html: string | null | undefined, maxChars = 320) {
  const text = stripHtml(html);
  if (text.length <= maxChars) return text;
  // End at a natural boundary if possible
  const slice = text.slice(0, maxChars);
  const neat = slice.replace(/[,.;:\s]+[^,.;:\s]*$/, "");
  return `${neat}…`;
}