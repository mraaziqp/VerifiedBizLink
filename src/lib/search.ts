// Business names are free text — "Silver crest Consulting" vs a search for
// "Silvercrest" fails a plain substring check purely over a space the
// searcher didn't expect. Stripping whitespace before comparing makes name
// search tolerant of that without touching real substring-position matches.
function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

export function matchesQuery(text: string, query: string): boolean {
  if (!query) return true;
  return normalize(text).includes(normalize(query));
}
