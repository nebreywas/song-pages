/** Minimal slugify for compiler-bridge (matches staticSiteUtils). */
function slugifySiteText(input) {
  const base = String(input || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'untitled';
}

module.exports = { slugifySiteText };
