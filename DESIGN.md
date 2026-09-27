---
name: "诗境 · 全唐诗文本图谱"
description: "Classical Chinese ink wash, modern interaction."
colors:
  paper: "#f5f5f0"
  ink: "#293f3a"
  muted: "#596862"
  red: "#a94737"
  line: "#cbd1c7"
  accent: "#627a52"
  plants: "#925957"
  landscape: "#3f716b"
  sky: "#526b84"
  colors: "#875145"
  plants-paper: "#f8f3f1"
  sky-paper: "#eef2f5"
  control-hover: "#e3e8df"
  white: "#fff"
typography:
  display:
    fontFamily: "Noto Serif SC, serif"
    fontSize: "68px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0"
  headline:
    fontFamily: "Noto Serif SC, serif"
    fontSize: "29px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0"
  quote:
    fontFamily: "Noto Serif SC, serif"
    fontSize: "25px"
    fontWeight: 400
    lineHeight: 1.85
    letterSpacing: "0"
  poem:
    fontFamily: "Noto Serif SC, serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 2.3
    letterSpacing: "0"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, sans-serif"
    fontSize: "12px"
    letterSpacing: "0"
rounded:
  flat: "0"
  seal: "2px"
  toast: "4px"
  circle: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  page: "64px"
components:
  icon-button:
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
    width: "40px"
    height: "40px"
  icon-button-hover:
    backgroundColor: "{colors.control-hover}"
    textColor: "{colors.red}"
  metric:
    textColor: "{colors.muted}"
    padding: "8px 0 11px"
    typography: "{typography.label}"
  metric-selected:
    textColor: "{colors.ink}"
  category-selected:
    textColor: "{colors.red}"
    padding: "8px 0 8px 12px"
  sort:
    textColor: "{colors.muted}"
    padding: "8px 0"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.toast}"
    padding: "12px 22px"
---

# Design System: 诗境

## Overview

**Creative North Star: "Classical Chinese ink wash, modern interaction."**

Approved visual world: classical Chinese ink wash, modern interaction. Code-led implementation; no approved image comp. Original raster painting supplies the landscape, never decorative SVG scenery. Three top-level views share one quiet research shell: imagery atlas, poet emotion, and poet clustering.

Key characteristics: sparse rules, unframed continuous landscape, no nested cards; legible analytical controls; linked chart and poetry states. This final specification records `src/style.css`, `src/main.js`, and `index.html`.

## Colors

Paper, green-black ink, muted metadata, and hairline dividers form the neutral foundation. Vermilion identifies selection, poem highlights, seals, hover, and focus. Category accents are seasons green, plants rose, landscape teal, sky blue, and a configured colors-category pigment. In the colors category, the selected word's pigment supersedes that configured accent; unselected bars use their individual pigments while selected bars remain vermilion.

Word pigments from `colorMap`: 白 #73817c, 青 #507d79, 红 #ad514c, 绿 #56845e, 紫 #806286, 碧 #448e87, 黄 #a38c41, 朱 #b64a36, 翠 #4b866c, 黑 #3a4142. These are readable chart pigments, not literal swatches. Plants and sky have the tinted paper tokens above; colors paper interpolates default paper 8% toward the selected word color, with #f3f1ef as CSS fallback. Native text selection uses #d8e1cf with #243b32 text.

## Typography

Display: self-hosted Noto Serif SC, bundled at weights 400 and 600. UI: system sans. Tracking 0 throughout; no viewport-scaled type. Category display is 68px/1.2, then 52px at 1100px and 45px at 700px. Chart heading is 29px/1.3, then 23px mobile. Brand is 29px at weight 600, then 25px mobile. Category names are 22px, then 17px mobile, with weight 600 for selection.

Poem heading is 20px, then 17px mobile. Quote is 25px/1.85, then 20px/1.9; full poem is 16px/2.3. Selected glyph is 45px/1, then 36px mobile. UI labels are principally 12px, metadata 10–13px, and mobile chart-foot labels 9px. Chart values use tabular numerals at 12px, axis labels 10px. Methodology uses 12px/2.1 and selected insight 12px/1.9.

## Layout

Desktop: compact masthead, a three-tab research switcher, and broad analytical canvases. The imagery view keeps left category navigation beside D3 bars with the poem strip beneath; the emotion view pairs a searchable poet rail with radar, normalized scores, and textual evidence; the cluster view pairs a full-width scatterplot with selected-poet detail. Mobile stacks every view and preserves horizontal category navigation. Controls stay legible over calm paper. The imagery rail sits on a near-opaque rice-paper layer so artwork never competes with its labels.

Masthead: max-width 1600px, minimum height 93px, padding 20px 56px. Scene and poem inner layouts: max-width 1488px, grid columns 29% and remainder, gap 8%, horizontal padding 64px. Scene padding is 46px 64px 32px with minimum height 650px. Chapter max-width is 280px. Poem strip padding is 42px 64px 38px, minimum height 215px. Methodology max-width is 1360px and its expanded content uses two columns with a 64px gap.

- At min-width 1600px: scene minimum height 690px, vertical padding 58px / 44px.
- At max-width 1100px: 32px gutters, 27% first column and 6% gap; category captions and masthead motto hidden.
- At max-width 700px: stacked layout, 23px content gutters, 21px masthead gutters, 75px masthead minimum height; horizontal five-option category navigation; chapter footer hidden; methodology single-column and footer wrapping. Fixed scene minimum height is removed.

Chart width follows its column, with a 240px computational minimum. D3 margins are left 36px, right 60px, top 27px, bottom 7px. Height is max(305px, item count × 31px + 32px); CSS reserves a desktop 314px minimum, mobile 305px. Bars are capped at 26px tall. Keep native row spacing and stable keyed identity.

## Elevation & Depth

No box shadows. Depth comes from raster transparency, multiply blending, masks, atmospheric canvas, hairlines, and tonal changes. Every imagery category owns a separate original raster scene: valley for seasons, blossom branch for plants, monumental waterfall for landscape, moonlit cloud field for sky, and mineral-pigment shanshui for colors. Term selection changes crop, filter, pigment, weather, and atmospheric motion. Mobile uses quieter opacity and category-specific focal positions. The isolated scene keeps controls above imagery. Toast is fixed at z-index 20 without shadow.

## Shapes

Sections and chart bars are square. Brand seal radius is 2px with an inset paper outline; toast radius is 4px. Icon controls and contextual sun/moon are circular. Dividers are generally 1px; metric and mobile category active underlines are 2px. No nested cards.

## Components

### Controls

Icon buttons are transparent 40px circles, 34px mobile; Lucide icons are 18px with stroke width 1.4. Hover adds control-hover fill and vermilion ink over 200ms. The pressed motion button retains the fill. Poem navigation uses outlined 32px circles, 30px mobile. Disabled controls have opacity 0.4. Icon-only buttons include accessible names and native title tooltips.

Category buttons have a 59px minimum height, bottom rule, serif label, sans caption, and an arrow revealed on hover or selection. Selected state uses `aria-pressed`, vermilion, weight 600, and 12px left padding. Mobile uses 44px minimum height and a 2px active underline, with no arrows or captions.

Metric buttons use `aria-pressed`, a shared baseline, 24px gap (18px mobile), and a dark 2px active underline. Sorting uses a transparent native select at 11px (10px mobile), maximum width 108px, paired with a 15px icon. There are no text-input, chip, or card primitives in this release.

### Chart and Reading

Chart rows support pointer and Enter/Space activation, accessible labels, and pressed states. Selected labels, values, and bars use vermilion. Focus outlines the transparent hit rectangle. The selected-word insight and chart summary provide live feedback. Poetry is unframed, with matched words highlighted in vermilion without fill. Full-poem toggle maintains `aria-expanded` and `aria-controls` and expands inline beneath a rule. Methodology uses native details/summary with a plus icon rotated 45 degrees when open. Download completion uses a live-status toast for 2500ms; loading and retry states occupy the chart.

### Research Views

The top tablist is a compact text control with small descriptive subtitles and keyboard arrow navigation. Emotion uses a hexagonal D3 radar beside six exact normalized values; selecting an axis or value updates lexicon evidence and a representative source excerpt. Clustering uses colored D3 points, direct labels only for the largest or selected authors, cluster filters, search, and a separate detail area. Both advanced views disclose sample thresholds, calculations, and interpretive limits inline.

### Focus and Motion

Focus-visible outline is 2px vermilion with 5px offset for native controls and focusable elements; SVG rows use the hit-rectangle outline. The skip link becomes visible on focus.

Signature: keyed D3 transitions preserve bar identity while positions, widths and counts change. Category changes reveal a new master painting through an 880ms clipped ink-wash entrance while the prior painting exits faster; term changes adjust crop and atmosphere within the same scene. Canvas motion includes ripples, mist bands, falling petals/leaves, cloud drift, rain/snow, stars, and blurred pigment currents. Poet changes preserve the same radar nodes and frequency rows: geometry, widths, colors, and numbers interpolate while headings and evidence use local ink reveals. Main transitions use cubic deceleration; reduced motion removes spatial movement. Motion switch always accessible.

Exact motion: imagery D3 bars use `easeCubicInOut` at 700ms; exit fade takes one third of that. Poetry fades from opacity 0.45 and translates from 6px over 430ms. New scene artwork reveals over 880ms with a clipped, blurred entrance and 420ms exit; term focus changes settle over 620ms. Emotion radar and frequency bars interpolate over 620–680ms with a capped 34ms row stagger; evidence resolves over 480ms. Category padding/arrow movement takes 400ms, color 300ms. Toast moves 15px over 300ms. Motion pause removes CSS transitions/animations, sets D3 duration to zero, and stops canvas playback. Reduced motion also disables smooth scrolling; hidden documents stop the animation loop.

## Do's and Don'ts

- **Do** preserve the approved ink-wash world, real raster imagery, and contemporary linked interactions.
- **Do** keep serif reading typography, system-sans controls, zero tracking, and consistent vermilion selection.
- **Do** preserve keyboard operation, responsive stacking, live feedback, and reduced-motion support.
- **Don't** introduce decorative SVG scenery, nested cards, shadows, or viewport-scaled text.
- **Don't** replace native controls with visual imitations or invent statistical meaning beyond literal counts.
