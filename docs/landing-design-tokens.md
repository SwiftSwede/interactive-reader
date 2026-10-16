# profekyle.com design tokens (marketing routes only)

Source: Thrive Themes inlined styles on https://www.profekyle.com/ homepage, extracted 2026-10-09. Copied here so the repo owns the sheet. The classroom app stays on the Paper Light theme in `DESIGN.md`. These tokens apply to public marketing routes (`/workshop`, and later `/quiz` or `/sound-test`). They do not apply to student or teacher pages.

Lobby wears street clothes. Classroom wears paper.

## Fonts

- Workshop event pages: **Open Sans** (matches the live webinar). Homepage marketing still uses Lato / Montserrat.
- Type scale: h1 28-40px / 1.3; h2 24px / 1.35; h3 20-22px / 1.4

## Colors

- Page background: `#fafafa` (alternate section `#f2f2f2`). No gold strip. The top announce bar is navy.
- Dark text: `#22252c`, body `#363942`, muted `#62697d`
- Accent: `#57b5e0` (links, highlights, rules)
- Workshop CTA: coral `#cc333d` (AA with `#fafafa`, 4.9:1), white text, 14px radius, 2px tracking. Thrive webinar used `#ff404d` (3.3:1, below AA).
- Workshop links: `#006b9a`.
- Workshop navy date card: `#202f60`, 10px radius. Surfaces (date card, inputs, qualify, FAQ) share 10px. Bio portrait: circle, 4px navy ring. CTA is 14px. IPA marks and step numbers are circles.
- Workshop hero: Liberty sits in a top band (`min(52vh, 480px)`, cropped to the statue), then a navy wash that becomes solid `#202f60` behind the form. Thanks does not load the photo. Do not use `liberty-800.webp` in the srcset (it is 374px wide).
- Pale tint: `#ddeef9`
- Urgency red: `#ec162c`, at most once on a page (the "Cupos limitados" line)
- White: `#ffffff`

## Buttons

- White text, no underline, Montserrat, uppercase, 2px letter-spacing
- CTA background `#0091cc`
- Hover (fine pointer only): `box-shadow: rgba(110, 125, 131, 0.25) 0 4px 14px`
- Press: `transform: scale(0.97)` over 160ms

## Column

Single column, max-width 680px, centered. Same column on desktop. No app tab bar, no app header.

## Conversion sequence (workshop)

Keep Kyle's Thrive visual skin (Liberty wash, coral CTA, 680px column). Conversion order follows the 2025-10 to 2026-10 archive set (Olly Fluency Sprint / Scaling Ladder, Brunson Comma Club / AI Secrets), not Tony article/RSVP pages and not Hormozi/Fladlien (no qualifying free landers).

- Label, title, subtitle, event facts (live / Zoom / 45 min / free), date card (no "Cuándo" label), then the **inline form**. Date stays above the fields. Same sequence on mobile. Desktop only adds side margin.
- Hero type sits in a short navy scrim so italic copy stays readable on Liberty. IPA circles use a 3-glyph Noto Sans subset (`ʔ ə ɪ`) at `/workshop/workshop-ipa.ttf` so Google-subsetted Charis does not fall back to `?` and `I`.
- Form stays in the first viewport. No popup. No phone field.
- Privacy line under the CTA: gratis, no card, email is for Zoom and the recording. Link to `https://www.profekyle.com/politica-de-privacidad/` (cookies and ad measurement). Footer repeats privacy + terms on profekyle.com.
- Repeat the coral CTA after proof blocks. First repeat sits on navy; the last repeat sits on the page background so the two bands are not identical.
