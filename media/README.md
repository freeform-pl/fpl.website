# Media files for the FPL blog

Drop the files below into place and the dashed placeholder slots on the page
fill in automatically (no HTML edits needed).

## Hero

| File | Content |
|---|---|
| `teaser.mp4` | Motivation / teaser video shown under the title (autoplays muted + looped) |

## Figures (`media/`)

| File | Shown as |
|---|---|
| `figure_reward.svg` | The multi-axis reward model figure (after the freeform UI) — ✅ in place |
| `figure_method.svg` | The full-system policy figure — ✅ in place |
| `figures/fig5_reward_analysis.png` | Dense-reward analysis on setup table (last section) — ⬜ to add |

Note: the compositionality scatter and the steerability schematic are drawn natively
(SVG/CSS) — no image needed.

## Task band — the "band of tasks" row in Results (`media/`)

All four shown at 2× speed. Three are in place; the cube task swaps per target bowl.

| File | Task | Status |
|---|---|---|
| `pick_place.mp4` | Put cube in target bowl (single video) | ⬜ to add |
| `fold_pants_multi.mp4` | Fold shorts | ✅ in place |
| `plate_toast_fpl_2x.mp4` | Plate toast | ✅ in place |
| `setuptable_multi.mp4` | Set up the table | ✅ in place |

## Collect-preferences interactive (`pref/`)

A single slider scrubs both trajectory videos together.

| File | Content | Status |
|---|---|---|
| `pref/trajectory_a.mp4` | Trajectory **A** (single failed-formal) | ✅ in place |
| `pref/trajectory_b.mp4` | Trajectory **B** (single middle) | ✅ in place |

## Side-by-side comparisons (`compare/`)

The "See it side by side" widget (after the task band) shows a baseline vs. FPL per task.

Naming for `toast` · `table` · `shorts`: `compare/<task>_<method>.mp4`
- method: `fpl` · `single_pref` (Single Preferences) · `bc` (Behavior Cloning)
- e.g. `compare/toast_fpl.mp4`, `compare/table_single_pref.mp4`, `compare/shorts_bc.mp4`

The **cube** task is bowl-conditioned (the widget shows orange/blue/yellow buttons):
`compare/cube_<method>_<bowl>.mp4` with bowl ∈ `orange` · `blue` · `yellow`
- e.g. `compare/cube_fpl_orange.mp4`, `compare/cube_single_pref_blue.mp4`

## Steerability demo (`steer/`)

| File | Content |
|---|---|
| `steer/cube_blue.mp4` | Policy conditioned to place the cube in the **blue** bowl |
| `steer/cube_orange.mp4` | … **orange** bowl |
| `steer/cube_yellow.mp4` | … **yellow** bowl |

## Compositionality demo (`compose/`)

Naming: `compose/square_<peg>_<speed>.mp4` with peg ∈ `left`/`right`, speed ∈ `slow`/`fast`:

- `compose/square_left_slow.mp4` (in data)
- `compose/square_left_fast.mp4` (in data)
- `compose/square_right_slow.mp4` (in data)
- `compose/square_right_fast.mp4` (**the composed, never-demonstrated behavior**)

Videos are muted/looped, so keep them short (5–20 s) and web-encoded
(`ffmpeg -i in.mp4 -c:v libx264 -crf 26 -movflags +faststart out.mp4`).
