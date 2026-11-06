# CrimeClient Launcher: design "Werkzeug"

The launcher looks like a precise tool, not a game ad: flat near-black surfaces, 1 px lines, small radii,
a wide-cut display font, numbers in mono. The accent (crimson by default, `useThemeStore`) is reserved for
**PLAY, the active page and progress**. Everything else is neutral.

## Tokens (`src/styles/globals.css`, Tailwind names in brackets)

| What | CSS | Tailwind |
|---|---|---|
| Page background | `--bg` #0e0e0f | `bg-bg` |
| Panels, sidebar | `--s1` #141416 | `bg-s1` |
| Inputs, hover | `--s2` #1a1a1d | `bg-s2` |
| Raised, selected, secondary buttons | `--s3` #232327 | `bg-s3` |
| Hover on raised | `--s4` #2c2c31 | `bg-s4` |
| Lines | `--line` / `--line-2` / `--line-3` (7 / 12 / 20 % white) | `border-line`, `border-line-2`, `border-line-3`, `divide-line` |
| Text | `--fg` #edebe8, `--fg-2` #a3a09b, `--fg-3` #6d6a66, `--fg-4` #4a4845 | `text-fg`, `text-fg-2`, `text-fg-3`, `text-fg-4` |
| States (muted) | `--ok`, `--warn`, `--err`, `--info` | `text-ok`, `bg-err/10`, `border-warn/35` … (opacity works) |
| Accent | `--accent`, `rgb(var(--accent-ch) / a)`, text on it `--on-accent` | `bg-accent`, `text-accent`, `bg-accent/15` |
| Radii | `--r-sm` (4), `--r-md` (6), `--r-lg` (8) from the radius setting | `rounded-sm`, `rounded-md`/`rounded-lg`, `rounded-xl`; `rounded-full` only for dots, avatars, toggles |
| Floating shadow | `--shadow-pop` | `shadow-pop` (menus, popovers, modals, toasts only) |
| Motion | `--ease` cubic-bezier(.2,.8,.2,1), 120 / 180 / 260 ms | `duration-fast`/`med`/`slow`, `ease-out` |

Surfaces and `fg` take opacity modifiers (`bg-bg/60`, `bg-s1/80`, `text-fg/70`; channels `--bg-ch` … `--fg-ch`). `text-white` is the warm off-white `--fg`; `gray-*`, `neutral-*` and `zinc-*` are the same warm scale.
In TSX inline styles use `src/lib/accent.ts`: `accent(0.15)`, `tokens.s2`, `tokens.line` … instead of gluing hex
alpha digits to `accentColor.value` (`${accentColor.value}30`). Most of those tints should become neutral anyway.

## Type

- UI: Archivo (`body`), 13 px for most UI text, 12 px secondary, 11 px meta. Weights 450/520/560/600.
- Display: Archivo wide (`font-display`, `h1`–`h6` get `font-stretch: var(--display-stretch)` = 116 %). Page titles 22–28 px
  weight 650–720, hero 44–48 px. Never all caps for long text.
- Mono: JetBrains Mono (`cc-num` or `font-mono`) for versions, sizes, counts, hashes, ping, playtime, keyboard hints.
- Small group labels: `cc-eyebrow` (11 px, uppercase, 0.06em, `--fg-3`).

## Building blocks

- Buttons: `components/ui/buttons/Button.tsx`. Variants: `default` = accent fill (only the main action of a view), `secondary`/`flat` =
  `s3` with a line, `ghost`, `destructive`/`warning`/`success`/`info` = state text with a hairline. Heights 28/32/36/44/48 (`xs`…`xl`).
- Panels: `cc-panel` (s1 + line + r-lg) or just a section separated by `border-line`. Prefer lines and spacing over boxes in boxes.
- Popovers/menus: `cc-popover` + `cc-pop` (enter animation); `MENU_PANEL_CLASSES`/`menuItemClasses` in `ui/design-system.ts`.
- Lists: dense rows (36–48 px), `divide-y divide-line` or row hover `hover:bg-s2`, actions appear on row hover. Selected row `bg-s3`.
- Tabs/segments: text tabs with a 2 px underline in `--fg` (active) or a segmented control (`bg-s2` track, `bg-s3` active).
- Inputs: `bg-s2 border border-line focus:border-line-3`, 32–36 px high, r-md.
- Toggles/checkboxes: on = `--fg` (light) with dark knob/check, not the accent.
- Empty states: one line of `fg-2` text, one of `fg-3`, optionally one secondary button. No big illustrations.
- Icons: lucide-react, `size={16}` (14 in dense rows), `strokeWidth={1.75}`. Iconify only where an icon is not in lucide.
- Old class names still exist and are flat now: `cc-glass` (s1 + line), `cc-glass-strong` (s2 + line-2), `cc-play-button`.

## Banned

`backdrop-blur*` (neutralised globally), gradients (`bg-gradient-*`, `linear-gradient` for decoration), glows and coloured
box shadows, text shadows, accent-tinted cards/borders/hover backgrounds, gradient buttons, emojis in UI text, pill navigation,
radii above `--r-lg`, `animate-bounce`/floating decoration, large blurred colour blobs. Exception: the 1 px grid background and image
fades for real images/thumbnails.

## Layout

- The frame (`layout/AppLayout.tsx`) gives each page the area right of the 208 px sidebar and below the 40 px title bar,
  directly on `--bg`. Pages own their padding (usually `px-6`/`px-8`, top 20–24 px).
- A page header: title (`font-display text-[22px] font-[650]`), one line of `fg-3` description, actions right; then a
  `border-line` separator or a toolbar row (search, filters, view switch).
- Must work at 1000×640 and 1280×800 (window min 1080×690; browser check also at 1000×640).

## Motion

Page enter `cc-enter` (fade + 6 px), popovers `cc-pop`, hovers `duration-fast`, layout changes `duration-med`.
`prefers-reduced-motion` is honoured globally. framer-motion is available for springs (press, reorder).

## Texts and mock

- New or changed texts go into `src/i18n/translations/en.json` and `de.json` (flat keys) via
  `python tools/add_i18n_keys.py . <keys.json>` (`{"key": {"en": "...", "de": "...", "_after": "existing.key"}}`; it locks the files).
- Browser preview without Tauri: `yarn dev` (port 1430) uses `src/dev/tauriMock.ts`. Add mock data for your area in
  `src/dev/mock/<area>.ts` exporting `handle(cmd, args)` (return `undefined` for commands that are not yours).
