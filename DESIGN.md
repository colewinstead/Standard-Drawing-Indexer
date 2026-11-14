---
name: Standard Drawing Indexer
description: Compact offline engineering drawing workspace
colors:
  accent: "#175a87"
  accent-hover: "#10466c"
  focus: "#176aa3"
  ink: "#253445"
  muted: "#5e6c7c"
  workspace: "#edf0f3"
  surface: "#fff"
  surface-subtle: "#f7f9fb"
  preview-ground: "#e6ebef"
  line: "#d9e0e6"
  control-line: "#c9d2db"
  control-hover: "#eff5fa"
  control-hover-line: "#91a9bc"
  control-active: "#e1edf6"
  previewed: "#eaf3fa"
  count-ground: "#edf2f6"
  count-ink: "#4a5f71"
  warning-ground: "#fff3df"
  warning-ink: "#71480f"
  warning-line: "#e5cfaa"
typography:
  title:
    fontFamily: "Segoe UI, Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    letterSpacing: "-.02em"
  panel-title:
    fontFamily: "Segoe UI, Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 650
  body:
    fontFamily: "Segoe UI, Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "13px"
  control:
    fontFamily: "Segoe UI, Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "13px"
    fontWeight: 550
  label:
    fontFamily: "Segoe UI, Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "11px"
  drawing-title:
    fontFamily: "Segoe UI, Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "11px"
    lineHeight: 1.5
rounded:
  control: "4px"
  dialog: "8px"
spacing:
  tight: "6px"
  control-gap: "8px"
  compact: "12px"
  panel-inset: "18px"
  section: "20px"
components:
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "5px 12px"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "5px 12px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.surface}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    padding: "3px 0"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "6px 9px"
  count:
    backgroundColor: "{colors.count-ground}"
    textColor: "{colors.count-ink}"
    rounded: "{rounded.control}"
    padding: "3px 7px"
---

# Design System: Standard Drawing Indexer

## Overview

**Creative North Star: "The Engineering Drawing Desk"**

A compact, light engineering workspace makes the original drawing the visual focus. Restrained blue identifies actions and state; neutral panels, fine dividers, and familiar file controls support repeated use. Bluebeam Revu and Windows File Explorer are familiarity references, without copied branding.

The interface uses practical density and quiet typography rather than promotional imagery. Catalog selection, drawing inspection, and explicit package order remain visually distinct. The desktop workspace is the primary operating context; narrow screens retain the same sequence as stacked panels.

**Key Characteristics:**
- Compact light utility surfaces
- Original drawing as the visual focus
- Restrained blue actions and state
- Visible keyboard focus and explicit order

## Colors

The palette combines a restrained engineering blue with cool white and gray working surfaces. Frontmatter records reused source values; semantic names here describe their use without changing the CSS source of truth.

### Primary
- **Engineering Blue** (`accent`): primary export action, actionable text, checkbox accent, document identity icon, and preview-state rail.
- **Deep Action Blue** (`accent-hover`): primary button hover.
- **Keyboard Blue** (`focus`): visible keyboard outlines; keep this role separate from selection.

### Neutral
- **Slate Ink / Muted Slate** (`ink`, `muted`): primary information and supporting metadata.
- **White Surface / Cool Utility Surface** (`surface`, `surface-subtle`): panels and toolbar/footer strips.
- **Workspace Gray / Preview Ground** (`workspace`, `preview-ground`): separators and the surround that frames the white original sheet.
- **Fine Divider / Control Stroke** (`line`, `control-line`): structural separation and field/button outlines.
- **Quiet Hover / Active Wash** (`control-hover`, `control-active`): button feedback, with `control-hover-line` on hover.
- **Preview Wash** (`previewed`): the currently inspected drawing row, accompanied by an inset blue rail.
- **Count Ground / Count Ink** (`count-ground`, `count-ink`): compact numerical badges.

Warning ground, ink, and line provide the amber review/error family. Messages always include explicit text; this is status color, not a second brand accent.

**The Drawing First Rule.** Interface color must support navigation and state while leaving the original drawing as the visual focus.

## Typography

The system sans stack in frontmatter follows desktop conventions. There is no separate display or decorative face. The title is compact, panel headings provide the next level, and most operational text uses body or label size. Supporting sheet metadata can be smaller than labels (10px); descriptions and project labels also use an intermediate size (12px).

Drawing identifiers use a semibold weight (650); drawing descriptions use normal weight and relaxed line spacing. Sheet references, count badges, package numbers, and zoom readouts use tabular numerals. Source drawing titles retain their supplied casing rather than receiving a global uppercase transform. The preview description is constrained to 75ch; help paragraphs to 70ch.

## Layout

The desktop app fills the viewport with a minimum height of 600px. A header, project strip, three-panel workspace, and status footer create a familiar working frame. Catalog on the left and ordered package on the right surround a flexible preview; the preview remains the principal document surface.

Default panel widths are 350px and 310px, separated from the center by two 6px resize handles. The center uses `minmax(280px, 1fr)`. The grid clamps catalog width to `clamp(270px, var(--catalog-width), calc((100vw - 292px) * .55))` and package width to `clamp(260px, var(--package-width), calc((100vw - 292px) * .45))`, so enlarged side panels fit when the window shrinks. Lists and preview scroll independently. Catalog resizing is bounded to 270–560px; package resizing to 260–520px, additionally constrained by available workspace width. Focused separators resize in 15px arrow-key increments.

At widths of at least 1650px, default side panels grow to 390px and 340px, and drawing descriptions gain a type-size step. At widths of at most 1100px, defaults reduce to 290px and 270px, horizontal insets tighten, and the library note hides. User resizing sets inline width properties and takes precedence over those defaults.

At widths of at most 880px, the workspace stacks catalog, preview, then package; resize handles hide. The catalog is 450px high and the preview 520px; the package spans 350–620px with a list capped at 360px. Header actions wrap and the page scrolls vertically. This is a responsive fallback; system file operations still target desktop Chrome or Edge.

Spacing is compact and mostly border-led. Reused frontmatter spacing values describe the existing vocabulary, not a new universal scale: panel headers and rows have context-specific insets. Avoid introducing expansive marketing whitespace.

## Elevation & Depth

Panels stay flat and are separated by pale tonal strips and fine borders. A soft shadow lifts only the original drawing from its preview ground; the help dialog uses a stronger shadow and dim backdrop. Selection and drag indicators use inset lines rather than floating cards. Exact shadow, focus, motion, and breakpoint values live in the sidecar.

**The Flat Workspace Rule.** Keep routine controls and panels flat; depth belongs to the original sheet and modal help.

## Shapes

Controls and count badges use the small control radius in frontmatter. The dialog uses the larger dialog radius. Catalog and package rows have square edges and full-width divider lines. The preview preserves the source page silhouette and aspect ratio; do not crop a sheet to create a decorative card.

## Components

### Buttons

Default controls are white, outlined, compact, and semibold. The primary export action fills the package width, uses engineering blue, and has a minimum height of 39px. Default buttons have a minimum height of 32px. Text actions are borderless blue labels with an underline on hover. Small reorder controls use compact arrow icons and explicit accessible names.

Hover changes background and border; active controls receive a quiet blue wash. Disabled buttons reduce opacity to .48 and keep a default cursor. All focus-visible controls receive a 2px Keyboard Blue outline with a 2px offset. Color and border transitions last .12s with ease-out; reduced-motion preference removes transitions.

### Inputs / Fields

White fields use the shared outlined control shape, a minimum height of 34px, and visible focus. The search input is 37px high with an inset magnifier and room for its text. Project name remains an explicit labeled field. Category uses a native select. Do not remove native affordances or rely on placeholders as labels.

### Navigation

Project-file navigation groups New/Open and Save/Save as with a thin separator. It uses ordinary buttons rather than a decorative menu system. Keyboard shortcuts are recorded in help. A skip link becomes visible on focus and targets the catalog.

### Counts / Containers

Count badges are small muted numerical labels, not interactive chips. White panel containers use divider lines and independent scrolling. Empty package guidance uses a restrained outline document icon, a small heading, and concise instructions.

### Drawing Catalog Row

Each row separates inclusion (checkbox) from inspection (a full-width text button). The inspected row has Preview Wash and an inset accent rail; the checkbox communicates package inclusion independently. Identifier and sheet number sit above the title; multipart metadata appears beneath. Keyboard focus is restored to the corresponding control when the catalog rerenders.

### Ordered Package Row

Numbered rows make export order explicit. Blue sheet links open the preview; arrow controls and drag operations change order, with removal kept at the opposite end of the tool row. Dragging reduces opacity to .5; the drop target uses an inset top accent line. Revised or missing entries include textual review guidance. Keyboard operations retain focus or move it to the package heading when the package becomes empty.

### Preview / Dialog

Zoom and fit controls sit in a compact toolbar above the scrollable preview. The original sheet remains white with its original proportions and no added markings. The preview viewport is keyboard focusable for scrolling. Help uses a native modal dialog with a visible Close button and readable text; the dialog is bounded to the viewport.

## Do's and Don'ts

### Do:
- **Do** keep the original drawing visually dominant and free of added markings.
- **Do** preserve visible keyboard focus on every interactive control.
- **Do** distinguish the previewed row from the checkbox inclusion state.
- **Do** keep export order visible through numbered package rows and explicit reorder controls.

### Don't:
- **Don't** introduce marketing illustrations, promotional hero sections, or decorative gradients into the workspace.
- **Don't** copy Bluebeam or File Explorer branding.
- **Don't** replace the compact rows with ornamental cards or large display typography.
- **Don't** use color alone to communicate inclusion, ordering, or review requirements.
