# Conveyor Belt Health Monitoring — 3D Rig

**SIH26008 · Team Unplayed**

A single-screen HMI for a conveyor belt health-monitoring rig: a three.js model of the
conveyor in real-world metres, animated from a simulated telemetry loop, with an operator
control panel, live readouts, and fault injection. The rig can be exported as OBJ + MTL or
GLB straight from the page.

Built with Next.js (App Router) + React + three.js. It is a React implementation of the
HTML/CSS/JS prototype that came out of Claude Design — that prototype and its chat
transcripts are still in the repo under `project/` and `chats/` for reference.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm start   # production
npm run typecheck            # tsc --noEmit
```

Requires a browser with WebGL. If the GPU context can't be created the stage degrades
through progressively simpler renderer options (own canvas, explicit `webgl2`/`webgl`,
software renderer tolerated, shadows off) and only then shows an error explaining how to
turn hardware acceleration back on.

## What the rig models

Everything is modelled in metres, y-up, with the belt centred on the origin, so the OBJ/GLB
exports land in any 3D tool at real scale.

| Part | Notes |
| --- | --- |
| Belt loop | Carry and return strands, head/tail pulley wraps, 26 chevron cleats riding a parametrised loop |
| Pulleys & idlers | Lagged head/tail pulleys on pillow blocks, 7 troughing idler sets, 3 return idlers — all spinning at belt speed |
| Feed | Loading hopper and skirtboards at the tail end |
| Discharge | Chute at the head end |
| Drive | Gearbox, finned motor, fan cowl, guard |
| Rip-detection gantry | Four legs, X-rails, a carriage that slides along the belt carrying a sensor head with **3 downward lasers** |
| LDR receiver array | Three lanes mounted **between the upper and lower belt runs**, looking up at the carcass |
| CNN vision camera | Mast, housing, lens, and a wireframe field-of-view cone at x = 1.75 m |
| Accelerometer | On the head-end bearing housing, with cable |
| Alarm beacon | Amber dome that pulses while the interlock is tripped |

### How rip detection works

The three lasers fire straight down onto the belt from the overhead gantry. The LDR array
sits *underneath* the top strand, so light only reaches a cell when there is a **hole or rip
in the belt carcass** — ore riding on top never triggers it. When a beam finds a hole it
extends through the belt down to the receiver, that lane's lens lights up, and the readout
shows `HOLE @ x.xx m`.

The same hole is confirmed on a second channel: as it passes the camera station the vision
FOV cone turns red and the CNN readout reads `HOLE`. Two independent channels seeing the
same defect is what a 2-of-3 voting interlock would trip on.

## Controls

| Control | Effect |
| --- | --- |
| Start / Stop | Ramps belt speed to the setpoint, or down to zero |
| E-Stop | Immediate stop and interlock trip |
| Reset interlock | Clears the trip so Start works again |
| Speed setpoint | 0–3 m/s; the belt ramps toward it with a first-order lag |
| Load | 0–100 %; drives ore spawn rate and the t/h readout |
| Mount X | −1.4 to 1.4 m; slides the laser carriage along the belt |
| Oversize rock | Spawns an amber oversize lump the camera flags as it passes |
| Belt hole / rip | Drops a hole into the belt that rides the loop |
| Trip interlock (2/3) | Simulates a 2-of-3 vote trip |
| Clear rocks / Ore feed | Wipe the belt, or turn the ore feed off entirely |
| Labels | Show/hide the 3D callout labels |

`prefers-reduced-motion` is respected: the beacon stops pulsing and laser/LDR flashes become
plain on/off states instead of ramps.

## Project layout

```
app/
  layout.tsx            root layout + metadata
  page.tsx              renders the rig view
  globals.css           page + HMI overlay styles
  design-system.css     "Industry" design-system tokens and components
components/
  ConveyorRigView.tsx   client shell — boots the stage, owns telemetry and label projection
  TitlePanel.tsx        top-left title card
  TelemetryPanel.tsx    top-right live readouts
  ControlPanel.tsx      bottom-left operator controls
  AlarmBanner.tsx       interlock trip banner
  BlueprintCorners.tsx  registration marks for .blueprint panels
lib/
  stage.ts              renderer, studio lighting, orbit controls, OBJ/GLB export
  conveyor-model.ts     the rig geometry + the telemetry-bound animation loop
project/                original Claude Design prototype (reference only)
chats/                  design conversation transcripts (reference only)
HANDOFF.md              the original design-handoff brief
```

### Notes on the port

- The prototype's `<three-d-stage>` custom element became the `Stage` class in `lib/stage.ts`;
  three.js is an npm dependency instead of a CDN import map.
- The animation loop stays imperative and runs off `Stage.onFrame` — driving 60 fps of belt
  motion through React state would be pointless churn. It pushes a `Telemetry` snapshot out
  on every frame; the view throttles that to 12 Hz before setting state, which is plenty for
  numbers a human reads.
- 3D callout labels are positioned by projecting their world anchors to screen space each
  frame. A label hides itself when it goes off-screen, behind the camera, or would overlap
  one of the HMI panels.
- The design system in `app/design-system.css` is copied verbatim from the handoff bundle. It
  is the source of truth for colours, type, and spacing — retune there, not in `globals.css`.
