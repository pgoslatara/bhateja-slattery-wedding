# Image generation prompts

Original prompts used to generate raster artwork in `src/assets/motifs/`. Saved verbatim so future sessions can regenerate or iterate without re-deriving the description from scratch.

All images are generated via the **Gemini MCP server** (`mcp__gemini__gemini-generate-image`). Output settings consistent across the hero work: `aspectRatio: "21:9"`, `imageSize: "2K"`, `style: "painterly cinematic illustration, watercolour"`.

The figures are described as **generic anonymous** in every prompt — viewed from behind or in soft profile, no full front-on faces, no celebrity references. Keeps the output as original creative work with no derivation from copyrighted sources.

---

## `hero-mustard-field-couple.jpg`

The site-wide background painting at the bottom of every page. Inlined in `Layout.astro` via `astro:assets` `<Image>` and rendered as a fixed-position element anchored to the viewport bottom.

**Pose:** "Option 2" — couple in 3/4 rear view gazing at each other; inside hands clasped at chest level; woman's outer hand sweeps outward with the pallu trailing. Quiet, intimate, no T-pose.

**Iteration history:** the very first generation hallucinated garbled wedding-invitation text in the upper sky region — fixed by adding the explicit "no text, no captions" block. The second generation rendered the painting in only the bottom 60 % of the canvas with a stark white band above — fixed by adding the explicit "fill the entire canvas, edge to edge" block. Both blocks are retained in the prompt below as belts-and-braces.

### Prompt (verbatim)

```text
A cinematic wide-aspect painting in a soft watercolour-meets-cinematic style, suitable as a wedding-website hero banner.

CRITICAL constraints:
1. The entire canvas, edge to edge, is filled with the painted scene — sky and clouds in the upper half, mustard field in the lower half. There must be NO blank, white, or unpainted areas anywhere. The watercolour wash extends to all four edges of the frame.
2. The image must contain absolutely no text, no captions, no titles, no lettering, no calligraphy and no written words anywhere. Pure illustration only — no typography, no labels, no signage, no writing, no script, no annotations, no watermarks.

A generic anonymous couple stands close together in the centre of the composition, in a vast mustard flower field at golden hour. They are seen from a three-quarter rear angle — primarily from behind, but turned slightly so each one's face is shown only in profile and softly out of focus, never a full front-on view.

The two figures gaze at each other rather than at the viewer. Their inside hands are clasped together at chest level between them — fingers gently interlocked. The man's free outside hand rests at his side; the woman's free outside hand sweeps gracefully outward and slightly upward, palm open, the pallu of her sari trailing softly with the gesture. The mood is quiet, romantic, intimate.

The man on the left is noticeably tall (around 183 cm) with fair pale Northern-European white skin tone (visible on the back of his neck, his profile, and his hand) and short dark brown hair. He wears a long formal cream sherwani that falls to mid-thigh, with cream churidar trousers.

The woman on the right is significantly shorter than him (around 157 cm — the top of her head reaches the man's shoulder, the height difference is clearly and obviously visible in proportion). She has long dark hair flowing down her back. She wears a flowing sage-green sari with a subtle gold border, the pallu draped softly over one shoulder.

The mustard field fills the lower half of the frame, densely covered in bright yellow blossoms; the horizon line sits roughly a third of the way up the frame and is gentle and slightly hazy; the sky fills the upper half with a warm gradient from golden-cream near the horizon to soft dusty blue at the top of the frame, with subtle painted clouds. Soft, romantic, painterly light. Composition is symmetric and serene; the couple is roughly centred and small-to-medium scale within the wide frame, leaving generous space of painted sky and field around them.
```

### Settings

| Param | Value |
|---|---|
| `aspectRatio` | `"21:9"` |
| `imageSize` | `"2K"` |
| `style` | `"painterly cinematic illustration, watercolour"` |

### How to regenerate

```text
mcp__gemini__gemini-generate-image
  prompt: <see verbatim block above>
  aspectRatio: "21:9"
  imageSize: "2K"
  style: "painterly cinematic illustration, watercolour"
```

Then:

```bash
cp <gemini-output-path> src/assets/motifs/hero-mustard-field-couple.jpg
npm run build   # Astro Image pipeline compresses to ~180 KB WebP
git add src/assets/motifs/hero-mustard-field-couple.jpg
git commit -m "feat(home): regenerate hero painting"
```

### Tweaking dimensions

If the proportions, height difference, sari shade, or sherwani style want adjustment, find and replace those specific phrases in the prompt block above and regenerate. For example:

- Sari colour: search for `sage-green sari` and substitute (e.g., `cream-and-gold lehenga`).
- Pose change: replace the second-from-top "The two figures gaze..." paragraph with a different pose description (the existing prompt is the "intimate hand-clasp" variant — option 2 from the original menu).
- Heights / proportions: the `183 cm` / `157 cm` numbers are a relatable proxy for the model; phrasing the difference as "the top of her head reaches the man's shoulder" makes it land more reliably than absolute numbers alone.
