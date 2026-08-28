// Conveyor belt health-monitoring rig — model + telemetry-bound animation.
// Real-world meters, y-up, belt centred on origin.

const stage = document.querySelector('three-d-stage');
const { THREE } = await stage.ready;

const W = 1.0;            // belt width
const R = 0.20;           // pulley radius
const HX = 2.60;          // pulley centre |x|
const YC = 0.85;          // pulley centre height
const RUN = HX * 2;       // straight run length
const LOOP = 2 * RUN + 2 * Math.PI * R;
const GATE1 = -1.15, GATE2 = -0.85;         // laser gate x
const SPACING_MM = Math.round((GATE2 - GATE1) * 1000);

const M = {
  steel: new THREE.MeshStandardMaterial({ name: 'steel_frame', color: 0x5980a6, roughness: 0.5, metalness: 0.35 }),
  graphite: new THREE.MeshStandardMaterial({ name: 'belt_rubber', color: 0x23272b, roughness: 0.85, metalness: 0.05 }),
  zinc: new THREE.MeshStandardMaterial({ name: 'roller_zinc', color: 0xb7bec6, roughness: 0.4, metalness: 0.38 }),
  panel: new THREE.MeshStandardMaterial({ name: 'guard_panel', color: 0xdcdee2, roughness: 0.7, metalness: 0.08 }),
  ore: new THREE.MeshStandardMaterial({ name: 'iron_ore', color: 0x6d6055, roughness: 0.95, metalness: 0.0 }),
  amber: new THREE.MeshStandardMaterial({ name: 'signal_amber', color: 0xd08a10, roughness: 0.5, metalness: 0.1 }),
  laser: new THREE.MeshStandardMaterial({ name: 'laser_beam', color: 0xd6402c, roughness: 0.9, emissive: 0x501008 }),
};

const root = new THREE.Group();
root.name = 'conveyor_rig';

function box(name, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.name = name; m.position.set(x, y, z);
  return m;
}
// cylinder whose axis lies along z (spin with rotation.z)
function roll(name, r, len, mat, x, y, z, seg = 32) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.name = name; m.position.set(x, y, z);
  return m;
}

/* ---------- structure ---------- */
const frame = new THREE.Group(); frame.name = 'frame';
const SZ = W / 2 + 0.10;
for (const s of [1, -1]) {
  frame.add(box(`stringer_${s > 0 ? 'a' : 'b'}`, RUN + 0.7, 0.10, 0.055, M.steel, 0, YC + 0.02, s * SZ));
  frame.add(box(`stringer_low_${s > 0 ? 'a' : 'b'}`, RUN + 0.7, 0.06, 0.05, M.steel, 0, YC - 0.42, s * SZ));
}
[-2.25, -0.75, 0.75, 2.25].forEach((x, i) => {
  for (const s of [1, -1]) {
    frame.add(box(`leg_${i}${s > 0 ? 'a' : 'b'}`, 0.075, YC + 0.02, 0.075, M.steel, x, (YC + 0.02) / 2, s * SZ));
    frame.add(box(`foot_${i}${s > 0 ? 'a' : 'b'}`, 0.22, 0.02, 0.18, M.steel, x, 0.01, s * SZ));
  }
  frame.add(box(`crossmember_${i}`, 0.06, 0.06, W + 0.2, M.steel, x, 0.16, 0));
});
root.add(frame);

/* ---------- pulleys, idlers ---------- */
const spinners = [];
function addSpinner(mesh, radius) { spinners.push({ mesh, radius }); return mesh; }

const pulleys = new THREE.Group(); pulleys.name = 'pulleys';
for (const [nm, x] of [['head_pulley', HX], ['tail_pulley', -HX]]) {
  const p = addSpinner(roll(nm, R, W + 0.05, M.zinc, x, YC, 0, 48), R);
  pulleys.add(p);
  // lagging ribs so rotation reads
  for (let i = 0; i < 6; i++) {
    const rib = box(`${nm}_rib_${i}`, 0.03, R * 2 - 0.004, W + 0.052, M.graphite, 0, 0, 0);
    rib.rotation.z = (i * Math.PI) / 6;
    p.add(rib);
  }
  for (const s of [1, -1]) {
    pulleys.add(box(`${nm}_pillow_block_${s > 0 ? 'a' : 'b'}`, 0.16, 0.20, 0.10, M.steel, x, YC - 0.06, s * (W / 2 + 0.09)));
    pulleys.add(roll(`${nm}_shaft_${s > 0 ? 'a' : 'b'}`, 0.032, 0.20, M.zinc, x, YC, s * (W / 2 + 0.12), 16));
  }
}
root.add(pulleys);

const idlers = new THREE.Group(); idlers.name = 'idlers';
for (let i = 0; i < 7; i++) {
  const x = -2.1 + i * 0.7;
  idlers.add(addSpinner(roll(`carry_idler_${i}`, 0.055, W * 0.62, M.zinc, x, YC + R - 0.058, 0, 24), 0.055));
  for (const s of [1, -1]) {
    const wing = addSpinner(roll(`wing_idler_${i}${s > 0 ? 'a' : 'b'}`, 0.048, W * 0.3, M.zinc, x, YC + R - 0.062, s * (W * 0.3), 20), 0.048);
    idlers.add(wing);
  }
}
[-1.6, 0, 1.6].forEach((x, i) => {
  idlers.add(addSpinner(roll(`return_idler_${i}`, 0.05, W * 0.92, M.zinc, x, YC - R - 0.055, 0, 24), 0.05));
});
root.add(idlers);

/* ---------- belt ---------- */
const belt = new THREE.Group(); belt.name = 'belt'; belt.position.y = YC;
const BT = 0.018;
belt.add(box('belt_carry_strand', RUN, BT, W, M.graphite, 0, R + BT / 2, 0));
belt.add(box('belt_return_strand', RUN, BT, W, M.graphite, 0, -R - BT / 2, 0));
for (const [nm, x, tStart] of [['belt_head_wrap', HX, 0], ['belt_tail_wrap', -HX, Math.PI]]) {
  const g = new THREE.CylinderGeometry(R + BT, R + BT, W, 40, 1, true, tStart, Math.PI);
  g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, M.graphite);
  m.name = nm; m.position.x = x; m.material.side = THREE.DoubleSide;
  belt.add(m);
}
root.add(belt);

// loop parametrisation: s = 0 at tail top, travelling +x
function loopPoint(s) {
  let u = ((s % LOOP) + LOOP) % LOOP;
  if (u < RUN) return { x: -HX + u, y: R, a: 0 };
  u -= RUN;
  if (u < Math.PI * R) { const p = u / R; return { x: HX + R * Math.sin(p), y: R * Math.cos(p), a: -p }; }
  u -= Math.PI * R;
  if (u < RUN) return { x: HX - u, y: -R, a: -Math.PI };
  const p = (u - RUN) / R;
  return { x: -HX - R * Math.sin(p), y: -R * Math.cos(p), a: -Math.PI - p };
}

// chevron cleats riding the loop
const CLEATS = 26;
const cleats = [];
for (let i = 0; i < CLEATS; i++) {
  const g = new THREE.Group(); g.name = `belt_chevron_${i}`;
  for (const s of [1, -1]) {
    const bar = box(`chevron_bar_${i}${s > 0 ? 'a' : 'b'}`, 0.30, 0.012, 0.045, M.panel, 0, 0, s * W * 0.19);
    bar.rotation.y = s * 0.42;
    g.add(bar);
  }
  belt.add(g); cleats.push(g);
}

/* ---------- loading hopper + skirtboards ---------- */
const feed = new THREE.Group(); feed.name = 'loading_point';
const hg = new THREE.CylinderGeometry(0.62, 0.30, 0.55, 4, 1, true);
const hop = new THREE.Mesh(hg, M.panel);
hop.name = 'loading_hopper'; hop.material.side = THREE.DoubleSide;
hop.position.set(-2.15, YC + R + 0.42, 0); hop.rotation.y = Math.PI / 4;
feed.add(hop);
for (const s of [1, -1]) {
  feed.add(box(`skirtboard_${s > 0 ? 'a' : 'b'}`, 1.5, 0.14, 0.02, M.panel, -1.85, YC + R + 0.08, s * (W / 2 - 0.06)));
}
root.add(feed);

/* ---------- discharge chute ---------- */
const chute = new THREE.Group(); chute.name = 'discharge_chute';
const cp = box('chute_back', 0.95, 0.02, W + 0.1, M.panel, 0, 0, 0);
cp.rotation.z = -0.75; cp.position.set(HX + 0.42, YC - 0.18, 0);
chute.add(cp);
for (const s of [1, -1]) {
  const side = box(`chute_side_${s > 0 ? 'a' : 'b'}`, 0.95, 0.34, 0.02, M.panel, HX + 0.42, YC - 0.14, s * (W / 2 + 0.05));
  side.rotation.z = -0.75; chute.add(side);
}
root.add(chute);

/* ---------- drive ---------- */
const drive = new THREE.Group(); drive.name = 'drive_unit';
drive.add(box('gearbox', 0.34, 0.30, 0.26, M.steel, HX, YC - 0.05, -(W / 2 + 0.30)));
const motor = roll('motor', 0.15, 0.42, M.steel, HX - 0.02, YC - 0.05, -(W / 2 + 0.72), 32);
drive.add(motor);
for (let i = 0; i < 9; i++) drive.add(roll(`motor_fin_${i}`, 0.158, 0.02, M.steel, HX - 0.02, YC - 0.05, -(W / 2 + 0.54) - i * 0.04, 24));
drive.add(roll('motor_fan_cowl', 0.12, 0.10, M.panel, HX - 0.02, YC - 0.05, -(W / 2 + 0.98), 24));
drive.add(box('drive_guard', 0.40, 0.44, 0.05, M.panel, HX, YC - 0.02, -(W / 2 + 0.14)));
root.add(drive);

/* ---------- sensors ---------- */
const sensors = new THREE.Group(); sensors.name = 'sensors';
const BELT_Y = YC + R + BT;
const gates = [];   // speed gates removed — loops below no-op

const CAM_X = 1.75;
const camMast = new THREE.Group(); camMast.name = 'vision_camera';
camMast.add(box('camera_mast', 0.06, 1.15, 0.06, M.steel, 1.75, YC + 0.57, W / 2 + 0.34));
camMast.add(box('camera_arm', 0.06, 0.06, 0.42, M.steel, 1.75, YC + 1.12, W / 2 + 0.13));
const housing = box('camera_housing', 0.16, 0.13, 0.22, M.panel, 1.75, YC + 1.02, 0.02);
housing.rotation.x = 0.25; camMast.add(housing);
const lens = roll('camera_lens', 0.045, 0.06, M.graphite, 1.75, YC + 0.95, 0.02, 24);
lens.rotation.x = Math.PI / 2 + 0.25; camMast.add(lens);
// field of view drawn as edges only — a wireframe cone, not a solid volume
const coneG = new THREE.ConeGeometry(0.42, 0.86, 4, 1, true);
const cone = new THREE.LineSegments(
  new THREE.EdgesGeometry(coneG),
  new THREE.LineBasicMaterial({ name: 'vision_fov', color: 0x5980a6, transparent: true, opacity: 0.55 })
);
cone.name = 'vision_fov_cone';
cone.position.set(1.75, YC + R + 0.42, 0.01); cone.rotation.set(Math.PI, Math.PI / 4, 0);
camMast.add(cone);
sensors.add(camMast);

const accel = new THREE.Group(); accel.name = 'accelerometer';
accel.add(box('accel_housing', 0.09, 0.06, 0.07, M.amber, HX, YC + 0.10, W / 2 + 0.09));
accel.add(box('accel_cable', 0.012, 0.012, 0.30, M.graphite, HX, YC + 0.07, W / 2 + 0.26));
sensors.add(accel);

const beacon = new THREE.Group(); beacon.name = 'alarm_beacon';
beacon.add(box('beacon_post', 0.05, 0.55, 0.05, M.steel, -2.5, YC + 0.28, -(W / 2 + 0.2)));
const dome = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.amber.clone());
dome.name = 'beacon_dome'; dome.material.name = 'beacon_lens';
dome.position.set(-2.5, YC + 0.56, -(W / 2 + 0.2));
beacon.add(dome); sensors.add(beacon);
root.add(sensors);

/* ---------- rip-detection gantry: 3 lasers + centre LDR on an X/Y mount ---------- */
const GZ = W / 2 + 0.26;
const RAIL_Y = 2.10;
const gantry = new THREE.Group(); gantry.name = 'rip_gantry';
for (const sx of [1, -1]) for (const sz of [1, -1]) {
  gantry.add(box(`gantry_leg_${sx > 0 ? 'h' : 't'}${sz > 0 ? 'a' : 'b'}`, 0.06, RAIL_Y, 0.06, M.steel, sx * 1.55, RAIL_Y / 2, sz * GZ));
}
for (const sz of [1, -1]) {
  gantry.add(box(`gantry_x_rail_${sz > 0 ? 'a' : 'b'}`, 3.45, 0.05, 0.07, M.steel, 0, RAIL_Y, sz * GZ));
  gantry.add(box(`gantry_x_scale_${sz > 0 ? 'a' : 'b'}`, 3.45, 0.02, 0.012, M.panel, 0, RAIL_Y + 0.04, sz * GZ));
}
// carriage — slides along X on the rails, carries the Y post
const bridge = new THREE.Group(); bridge.name = 'gantry_x_carriage';
bridge.add(box('carriage_cross_beam', 0.11, 0.07, W + 0.66, M.steel, 0, RAIL_Y - 0.06, 0));
for (const sz of [1, -1]) bridge.add(box(`carriage_shoe_${sz > 0 ? 'a' : 'b'}`, 0.17, 0.10, 0.12, M.panel, 0, RAIL_Y, sz * GZ));
bridge.add(box('carriage_y_post', 0.05, 0.95, 0.05, M.steel, 0, RAIL_Y - 0.52, 0));
bridge.add(box('carriage_y_scale', 0.014, 0.95, 0.02, M.panel, 0.035, RAIL_Y - 0.52, 0));
// sensor head — slides up and down the Y post
const head = new THREE.Group(); head.name = 'sensor_head_ldr_array';
head.add(box('head_slide_block', 0.10, 0.13, 0.09, M.panel, 0, 0.06, 0));
head.add(box('head_body', 0.20, 0.09, 0.44, M.steel, 0, 0, 0));
const lasers = [];
[-0.16, 0, 0.16].forEach((z, i) => {
  head.add(box(`laser_emitter_${i + 1}`, 0.07, 0.07, 0.07, M.panel, 0.075, -0.05, z));
  const b = roll(`rip_laser_beam_${i + 1}`, 0.005, 1, M.laser.clone(), 0.075, 0, z, 10);
  b.geometry.rotateZ(Math.PI / 2);          // axis along y
  b.material.name = `rip_laser_${i + 1}`;
  head.add(b);
  lasers.push({ mesh: b, x: 0.075, z });
});
bridge.add(head);
gantry.add(bridge);
root.add(gantry);

/* ---------- LDR receiver array: BETWEEN the belt runs, looking up at the carcass ----------
   Overhead lasers strike the belt from above; light only reaches these cells through a
   hole or rip, so the array reads the BELT itself and never the ore riding on top. */
const LDR_Y = YC + R - 0.19;
const ldrRig = new THREE.Group(); ldrRig.name = 'ldr_receiver_array';
ldrRig.add(box('ldr_mount_rail', 3.5, 0.05, 0.09, M.steel, 0, LDR_Y - 0.07, 0));
for (const sx of [1, -1]) {
  ldrRig.add(box(`ldr_rail_post_${sx > 0 ? 'a' : 'b'}`, 0.05, LDR_Y - 0.25, 0.05, M.steel, sx * 1.62, (LDR_Y - 0.09 + 0.16) / 2, 0));
}
const ldrLanes = [];
[-0.16, 0, 0.16].forEach((z, i) => {
  ldrRig.add(box(`ldr_cell_housing_${i + 1}`, 3.34, 0.05, 0.11, M.amber, 0, LDR_Y, z));
  const lens = box(`ldr_cell_lens_${i + 1}`, 3.30, 0.014, 0.065, M.graphite, 0, LDR_Y + 0.031, z);
  ldrRig.add(lens);
  ldrLanes.push({ mesh: lens, z });
});
ldrRig.add(box('ldr_signal_cable', 0.014, 0.014, 0.62, M.graphite, 1.62, LDR_Y - 0.07, -0.3));
root.add(ldrRig);

// belt holes / rips riding the loop — a punched void with a frayed bright rim so it
// reads clearly against the dark carcass from any orbit angle
const holes = [];
const HOLE_POOL = 3;
const voidMat = new THREE.MeshStandardMaterial({ name: 'belt_rip_void', color: 0x08090b, roughness: 1, side: THREE.DoubleSide });
const rimMat = new THREE.MeshStandardMaterial({ name: 'belt_rip_rim', color: 0xd9d2c4, roughness: 0.8, emissive: 0x2a2213 });
for (let i = 0; i < HOLE_POOL; i++) {
  const g = new THREE.Group(); g.name = `belt_rip_${i}`;
  const HL = 0.42, HW = 0.20;              // hole footprint (m)
  g.add(box(`belt_rip_void_${i}`, HL, 0.012, HW, voidMat, 0, 0.016, 0));
  // rim frame: four bars around the void, standing just above the belt face
  g.add(box(`belt_rip_rim_${i}_a`, HL + 0.05, 0.022, 0.026, rimMat, 0, 0.026, HW / 2 + 0.013));
  g.add(box(`belt_rip_rim_${i}_b`, HL + 0.05, 0.022, 0.026, rimMat, 0, 0.026, -(HW / 2 + 0.013)));
  g.add(box(`belt_rip_rim_${i}_c`, 0.026, 0.022, HW, rimMat, HL / 2 + 0.013, 0.026, 0));
  g.add(box(`belt_rip_rim_${i}_d`, 0.026, 0.022, HW, rimMat, -(HL / 2 + 0.013), 0.026, 0));
  // torn flaps at each end, lifted off the carcass
  for (const sx of [1, -1]) {
    const f = box(`belt_rip_flap_${i}_${sx > 0 ? 'a' : 'b'}`, 0.10, 0.014, HW * 0.8, rimMat, sx * (HL / 2 + 0.055), 0.055, 0);
    f.rotation.z = sx * -0.5;
    g.add(f);
  }
  g.visible = false;
  belt.add(g);
  holes.push({ group: g, s: 0, z: 0, active: false });
}

/* ---------- ore load ---------- */
const rocks = [];
const ROCK_POOL = 22;
const oreGroup = new THREE.Group(); oreGroup.name = 'ore_load'; oreGroup.position.y = YC;
for (let i = 0; i < ROCK_POOL; i++) {
  const g = new THREE.IcosahedronGeometry(1, 0);
  const p = g.attributes.position;
  for (let v = 0; v < p.count; v++) {
    p.setXYZ(v, p.getX(v) * (0.75 + Math.random() * 0.5), p.getY(v) * (0.7 + Math.random() * 0.5), p.getZ(v) * (0.75 + Math.random() * 0.5));
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, M.ore);
  m.name = `ore_lump_${i}`; m.visible = false;
  oreGroup.add(m);
  rocks.push({ mesh: m, active: false, size: 0.1, x: 0, spin: 0, oversize: false, past1: false, t1: 0 });
}
root.add(oreGroup);

stage.setObject(root);
// closer default framing than the auto-fit (the rig is long and low)
stage._camera.position.set(1.3, 2.9, 8.4);
stage._controls.target.set(-0.25, 0.8, 0);
stage._controls.update();

/* ================= telemetry-bound animation ================= */
const ui = window.__hmi;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {
  running: true, setpoint: 1.8, speed: 1.8, load: 0.55,
  beltS: 0, dt_ms: null, tripped: false, tripReason: null,
  detect: null, detectUntil: 0,
  mountX: -0.35,                        // gantry carriage X (m); height is fixed by the frame
  oreOn: true,
  ldr: 0, ripAt: null, ripUntil: 0, ldrLane: -1,
};
window.__conveyor = { state, inject, cmd };

function cmd(k, v) {
  if (k === 'start') { if (!state.tripped) state.running = true; }
  if (k === 'stop') state.running = false;
  if (k === 'estop') { state.running = false; state.tripped = true; state.tripReason = 'E-STOP — operator'; }
  if (k === 'reset') { state.tripped = false; state.tripReason = null; }
  if (k === 'speed') state.setpoint = v;
  if (k === 'load') state.load = v;
  if (k === 'mount_x') state.mountX = v;
  if (k === 'ore') {
    state.oreOn = !!v;
    if (!v) { spawnAcc = 0; for (const r of rocks) { r.active = false; r.mesh.visible = false; } }
  }
  if (k === 'clear_ore') { spawnAcc = 0; for (const r of rocks) { r.active = false; r.mesh.visible = false; } }
}
function inject(kind) {
  if (kind === 'oversize') spawnRock(true);
  if (kind === 'rip') {
    const h = holes.find((h) => !h.active) || holes[0];
    h.active = true;
    h.s = 0.35 - state.beltS;   // enters the top run just past the tail pulley                        // just upstream of the gantry
    h.z = (Math.random() - 0.5) * 0.34;
    h.group.visible = true;
  }
  if (kind === 'trip') { state.tripped = true; state.running = false; state.tripReason = 'OVERSIZE ROCK — vision + LDR (2/3)'; }
}

let spawnAcc = 0;
function spawnRock(oversize) {
  const r = rocks.find((r) => !r.active);
  if (!r) return;
  r.active = true; r.oversize = !!oversize;
  r.size = oversize ? 0.30 : 0.055 + Math.random() * 0.075;
  r.x = -2.30 + Math.random() * 0.12;
  r.z = (Math.random() - 0.5) * (W - 0.3 - r.size);
  r.spin = Math.random() * 6;
  r.past1 = false;
  r.mesh.scale.setScalar(r.size);
  r.mesh.material = oversize ? M.amber : M.ore;
  r.mesh.visible = true;
}

let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  const target = state.running && !state.tripped ? state.setpoint : 0;
  state.speed += (target - state.speed) * (1 - Math.exp(-dt / (target === 0 ? 0.26 : 0.4)));
  if (state.speed < 0.004) state.speed = target === 0 ? 0 : state.speed;
  state.beltS += state.speed * dt;

  // belt surface + rollers
  for (let i = 0; i < CLEATS; i++) {
    const p = loopPoint(state.beltS + (i * LOOP) / CLEATS);
    const c = cleats[i];
    c.position.set(p.x, p.y * 1.045, 0);
    c.rotation.z = p.a;
  }
  for (const s of spinners) s.mesh.rotation.z = -state.beltS / s.radius;

  // ore flow
  if (state.speed > 0.05 && state.oreOn) {
    spawnAcc += dt * (0.4 + state.load * 5.2) * Math.min(state.speed / 1.8, 1.4);
    while (spawnAcc >= 1) { spawnAcc -= 1; spawnRock(false); }
  }
  for (const r of rocks) {
    if (!r.active) continue;
    const prev = r.x;
    r.x += state.speed * dt;
    r.mesh.position.set(r.x, R + r.size * 0.62, r.z);
    r.mesh.rotation.set(r.spin, r.spin * 0.7, -state.beltS / r.size * 0.35);
    for (let gi = 0; gi < gates.length; gi++) {
      const g = gates[gi];
      if (prev < g.x && r.x >= g.x) {
        g.glow = 1;
        if (gi === 0) { r.past1 = true; r.t1 = now; }
        if (gi === 1 && r.past1) state.dt_ms = Math.max(1, Math.round(now - r.t1));
      }
    }
    if (r.oversize && r.x > 1.1 && r.x < 2.3) { state.detect = 'OVERSIZE'; state.detectUntil = now + 400; }
    if (r.x > HX + 0.12) { r.active = false; r.mesh.visible = false; }
  }

  // rip gantry: carriage tracks the X setpoint; head sits at a fixed frame height
  const BELT_TOP = YC + R + BT;
  bridge.position.x += (state.mountX - bridge.position.x) * Math.min(1, dt / 0.12);
  head.position.y = BELT_TOP + 0.50;
  const gap = Math.max(0.02, head.position.y - BELT_TOP - 0.085);

  // belt holes ride the loop; light reaches an LDR cell only through a hole in the carcass.
  // the same hole is also confirmed by the vision camera when it passes the camera's field.
  let seen = null, hitLane = -1, camHole = null;
  for (const h of holes) {
    if (!h.active) continue;
    const q = loopPoint(state.beltS + h.s);
    h.group.position.set(q.x * 1.01, q.y * 1.075, h.z);
    h.group.rotation.z = q.a;
    if (q.y > 0) {
      lasers.forEach((l, li) => {
        if (Math.abs(q.x - (bridge.position.x + l.x)) < 0.09 && Math.abs(h.z - l.z) < 0.10) { seen = q.x; hitLane = li; }
      });
      if (q.x > CAM_X - 0.55 && q.x < CAM_X + 0.55) camHole = q.x;
    }
  }
  if (camHole !== null) { state.detect = 'HOLE'; state.detectUntil = now + 900; }
  // a beam that found a hole carries on down to the receiver below the belt
  lasers.forEach((l, li) => {
    const len = li === hitLane ? head.position.y - 0.085 - LDR_Y : gap;
    l.mesh.scale.set(1, len, 1);
    l.mesh.position.y = -0.085 - len / 2;
  });
  if (seen !== null) { state.ldr = 1; state.ripAt = seen; state.ripUntil = now + 900; state.ldrLane = hitLane; }
  else state.ldr = Math.max(0, state.ldr - dt / 0.5);
  const lk = reduce ? (state.ldr > 0 ? 1 : 0) : state.ldr;
  for (const l of lasers) {
    l.mesh.material.color.setRGB(0.84 + 0.16 * lk, 0.25 - 0.12 * lk, 0.17 - 0.1 * lk);
    l.mesh.material.emissive.setRGB(0.3 + 0.6 * lk, 0.05, 0.03);
  }
  ldrLanes.forEach((lane, i) => {
    lane.mesh.material = lk > 0.05 && state.ldrLane === i ? M.laser : M.graphite;
  });

  if (state.detect === 'HOLE' && now < state.detectUntil) {
    cone.material.color.setRGB(0.84, 0.25, 0.17);
    cone.material.opacity = 0.95;
  } else {
    cone.material.color.setHex(0x5980a6);
    cone.material.opacity = 0.55;
  }

  // laser gate decay
  for (const g of gates) {
    g.glow = Math.max(0, g.glow - dt / 0.12);
    const k = reduce ? 0 : g.glow;
    g.beam.material.color.setRGB(0.84 + 0.16 * k, 0.25 - 0.1 * k, 0.17 - 0.1 * k);
    g.beam.material.emissive.setRGB(0.31 + 0.6 * k, 0.06, 0.03);
    g.beam.scale.set(1 + k * 2.2, g.len, 1 + k * 2.2);
  }
  // beacon
  const alarm = state.tripped && !reduce ? 0.5 + 0.5 * Math.sin(now / 130) : 0;
  dome.material.color.setRGB(0.82 * (0.55 + alarm * 0.45), 0.54 * (0.5 - alarm * 0.3) + alarm * 0.1, 0.06);
  dome.material.emissive = new THREE.Color(state.tripped ? 0.45 * alarm : 0, 0, 0);

  if (ui) ui.update(state, { LOOP, SPACING_MM, detect: now < state.detectUntil ? state.detect : null, rip: now < state.ripUntil ? state.ripAt : null });
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
