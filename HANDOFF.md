# Project Handoff

## Current Project Direction

- **Project:** Physics Simulation Lab — Motion Graphs
- **Goal:** Create a 16:9 TV-ready motion graph simulation.
- **Theme:** Manim-inspired dark theme.
- **Main focus:** Three large, transparent graphs:
  1. Displacement–time
  2. Velocity–time
  3. Acceleration–time

## Graph Style

- No rectangular graph background.
- Transparent canvas and background.
- Thin, low-opacity gridlines.
- Large, readable axes and labels for classroom displays.

## Controls

- Use compact controls at the top of the page.
- Present presets in a dropdown.
- Remove the Motion Model panel.
- Remove the Time Interval control.
- Use 1-second sampling internally.

## Motion Diagram

- Place it below the graphs.
- Do not use a rectangular border.
- Show only a number line.
- Show one dot at the current position.
- Attach a velocity arrow to the current-position dot.
- Do not show acceleration arrows.
- Do not show Δx arrows.
- Do not show intermediate dots.

## Presets

Use these constant-acceleration presets:

1. Object at Rest
2. Constant Velocity Forward
3. Constant Velocity Backward
4. Speeding Up Forward
5. Slowing Down Forward
6. Speeding Up Backward
7. Slowing Down Backward
8. Turn Around Motion
9. Constant Acceleration from Rest

Exclude piecewise cases for now.

## Implementation Constraints

- Preserve existing functionality unless a change is intentional and documented.
- Do not rewrite the app.
- Modify only the files necessary for the requested change.
