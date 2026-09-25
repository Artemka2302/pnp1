# Mobile homepage redesign

This document is the working contract for the PNP mobile homepage. It records
approved decisions and defects already solved so later blocks do not reintroduce
them.

## Scope and source of truth

- Mobile homepage only, currently `max-width: 680px`.
- Desktop remains the functional/content reference and must not regress.
- No backend, database, migrations, API contracts, CRM, messenger endpoints, or
  analytics changes.
- Visual reference: the approved 390 × 844 portrait composition supplied on
  2026-08-25.
- Mobile overrides live in `static/css/home-mobile-redesign.css` and are loaded
  last. New rules must stay under `body.home-page`.

## Approved visual language

- No beige and no neutral gray page background.
- White: `#fefefe`.
- Deep navy: `#081426`.
- Brand navy: `#202c47`.
- Burgundy: `#6d2039`.
- Blue-gray: `#768fb0`.
- Soft pink accent: `#d6a8b9`.
- Full-bleed photography, dark navy overlays, restrained radii, thin light
  borders, and generous negative space replace nested white cards.
- One strong message and one primary decision per viewport; decorative elements
  must not compete with content.

## Header and hero MVP

- Header overlays the photograph at the top of the page and becomes dark after
  scrolling or while a menu is open.
- Existing PNP white logo is used; phone and menu retain their original
  accessible names and JavaScript functionality.
- Phone opens four existing frontend channels in this order: AI, manager,
  Telegram, MAX.
- The duplicate floating support trigger and the external Bitrix floating
  launcher are hidden on the mobile homepage. The Bitrix chat API remains
  available to the manager flow.
- Hero uses `hero-cover-mobile.webp`, a clean 853 × 1844 portrait asset derived
  from the approved composition and the original PNP building photograph.
- Hero copy has three controlled lines; every line must fit without clipping.
- Both CTAs remain side by side and inside the first viewport.
- Cookie consent remains mandatory. On mobile home it is a compact panel below
  the header so it does not cover the hero copy or CTAs. It is only temporarily
  hidden while the support panel is open.

## Defects already found and prevented

1. The shared `.page` reserved 70 px for a non-overlay mobile header. On home it
   must stay at `padding-top: 0`, otherwise the CTA row drops below the viewport.
2. The contact dropdown is `position: fixed`; its right offset is viewport-based,
   not phone-button-based. It must use the 15 px viewport gutter.
3. `overflow-x: hidden` can conceal clipped text while the document reports no
   horizontal overflow. Audit every fixed title line with both `clientWidth` and
   `scrollWidth`.
4. At roughly 360 px, the full logo and action buttons can collide. The compact
   logo rule begins at 380 px.
5. The support panel inherited a negative left edge. On mobile home it uses 12 px
   safe gutters and a viewport-based maximum height.
6. Django started with `--noreload` caches templates. Restart the local server
   after template/cache-buster changes before accepting browser results.
7. Chromium headless on Windows enforces a minimum layout width; a 390 px output
   image can be a crop of a wider layout. Browser DOM geometry at an explicitly
   calibrated responsive viewport is the acceptance source, not that crop.
8. Shared header pseudo-elements use old `!important` masks. A mobile icon is
   accepted only after checking its computed `mask-image` and every inherited
   pseudo-element; otherwise the legacy chat glyph and status dot can survive.

## Validation matrix

The header/hero passed layout checks at 360 × 800, 375 × 667, 390 × 844,
412 × 915, and 430 × 932. The 320 × 568 CSS fallback is intentionally more
compact. For every later block, repeat at least 360 × 800, 390 × 844, and
430 × 932, then run one desktop regression.

For each size verify:

- no document horizontal overflow;
- no clipped text (`scrollWidth <= clientWidth` for controlled lines);
- all interactive controls have at least a 40 px touch target;
- cards and panels stay inside safe gutters;
- the primary action is visible and reachable;
- phone, menu, Escape, close, and scroll states remain consistent;
- reduced-motion behavior remains usable.

## Completed block order

1. `С кем работаем` — one compact five-row icon list with short explanations,
   no arrows and no horizontal-scroll ambiguity.
2. `Комплектация по проекту` — the existing dynamic catalogue is reused as a
   two-column photo grid; all 14 cards remain real links.
3. `Популярные бренды` — the desktop data source, filter controller, arrows and
   automatic movement are reused; the three filters fit without overflow.
4. `Ход работы` — the existing four-stage controller is reused; every stage is
   clickable, cycles automatically, and shows its own image and routes.
5. Quick request — both supply and cooperation forms remain functional and are
   contained inside the mobile viewport.
6. Clients and suppliers — existing content and links are preserved and
   restyled without duplicate mobile markup.
7. Shared footer — its CTA, support action, supplier link and accordions remain
   functional in the new mobile visual system.

The old oversized mobile-only duplicates and the noisy technical benefits
console are hidden only on the mobile homepage. Desktop content remains visible.

## Reusable implementation lessons

1. Prefer the existing desktop data source and JavaScript controller when a
   mobile block needs the same content or automation. Re-skin it with scoped
   CSS instead of creating another static content copy.
2. Hide obsolete mobile duplicates only after the shared dynamic source works
   at every target width. This prevents doubled headings and stale content.
3. Validate animation twice: first by manually choosing every state, then by
   waiting through an automatic transition and checking the active label,
   content and background image together.
4. A section is not accepted merely because the document has no horizontal
   overflow. Check the bounds of its tabs, buttons, cards, form fields, labels
   and controlled text individually.
5. Keep all mobile overrides in the last-loaded, homepage-scoped stylesheet.
   Do not patch shared desktop rules to solve a mobile-only defect.
6. Preserve working endpoints and event hooks. The redesign changes layout and
   presentation; it does not duplicate or replace form, chat or analytics logic.

## Final acceptance record

The complete homepage passed DOM geometry and interaction checks at 360 × 800,
375 × 667, 390 × 844 and 430 × 932. At every size it had no horizontal document
overflow or broken images; hero lines and actions, all five role rows, supply
cards, brand controls, workflow controls, both form modes and the footer stayed
inside their containers. The role block also fits within one phone viewport.

Manual interaction checks passed for the phone panel, menu mutual exclusion,
Escape/close behavior, AI and manager support modes, cookie panel, brand filters
and autoplay, workflow stages and autoplay, both request-form tabs, footer AI
action, supplier link and footer accordions. Reduced-motion rules remain present.

Desktop regression passed at 1910 × 1074: the desktop hero and benefits block
remain visible, the mobile hero and summaries remain hidden, desktop catalogue,
brands, workflow and footer layouts are preserved, and no images are broken.

Each future block change is complete only after content, layout, interaction,
responsive, accessibility and desktop-regression checks pass again.
