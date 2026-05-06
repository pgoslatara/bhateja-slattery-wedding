# Fonts

Currently the site loads Google Fonts via stylesheet link. To self-host
(per the spec's privacy preference, §6.4):

1. Download the WOFF2 files for Playfair Display, Cormorant Garamond,
   Inter, Tiro Devanagari Hindi, and Noto Sans Devanagari.
2. Place them in this directory.
3. Replace the `<link rel="stylesheet" href="https://fonts.googleapis.com/...">`
   tag in `src/components/Layout.astro` with a local `@font-face` stylesheet.

This is a non-blocking follow-up — the site is functional with the CDN link.
