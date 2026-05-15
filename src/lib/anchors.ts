// Derive a stable, human-readable HTML id from a content-collection entry id.
//
// Entry ids look like `01-dress-code.en.md` or `02-ceremony.hi.md`. We strip
// the locale + extension and the leading sort prefix so anchors are language-
// neutral and predictable for sharing (e.g. `/faq/#dress-code`).
export function anchorFromEntryId(entryId: string): string {
  return entryId.replace(/\.(en|hi)\.md$/, '').replace(/^\d+-/, '');
}
