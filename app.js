const $ = (selector) => document.querySelector(selector);

const controls = {
  p0: $("#position"),
  v0: $("#velocity"),
  a: $("#acceleration"),
  duration: $("#duration"),
};

const SAMPLE_INTERVAL = 1;
const VELOCITY_ARROW_SCALE = 12;
const VELOCITY_ARROW_MIN = 28;
const VELOCITY_ARROW_MAX = 96;
const VELOCITY_ZERO_EPSILON = 0.005;

const presets = {
  rest: { p0: 0, v0: 0, a: 0, duration: 8 },
  constantForward: { p0: -6, v0: 2, a: 0, duration: 8 },
  constantBackward: { p0: 6, v0: -2, a: 0, duration: 8 },
  speedUpForward: { p0: -8, v0: 1, a: 0.75, duration: 8 },
  slowDownForward: { p0: -8, v0: 6, a: -0.75, duration: 8 },
  speedUpBackward: { p0: 8, v0: -1, a: -0.75, duration: 8 },
  slowDownBackward: { p0: 8, v0: -6, a: 0.75, duration: 8 },
  turnAround: { p0: -4, v0: 4, a: -1, duration: 8 },
  accelFromRest: { p0: -8, v0: 0, a: 1, duration: 8 },
};

const state = {
  ...presets.rest,
  time: 0,
  playing: false,
  lastFrame: null
};

function motionAt(t) {
  return {
    p: state.p0 + state.v0 * t + 0.5 * state.a * t * t,
    v: state.v0 + state.a * t,
    a: state.a,
  };
}

function sampleTimes() {
  const times = [];
  for (let t = 0; t <= state.duration; t += SAMPLE_INTERVAL) times.push(t);
  if (times[times.length - 1] !== state.duration) times.push(state.duration);
  return times;
}

function pretty(value, digits = 2) {
  const rounded = Math.abs(value) < 0.005 ? 0 : value;
  return rounded.toFixed(digits).replace("-", "−");
}

function resizeCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width * dpr);
  const height = Math.round(rect.height * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

function colors() {
  const styles = getComputedStyle(document.body);
  return {
    ink: styles.getPropertyValue("--ink").trim(),
    muted: styles.getPropertyValue("--muted").trim(),
    line: styles.getPropertyValue("--line").trim(),
    teal: styles.getPropertyValue("--teal").trim(),
    pink: styles.getPropertyValue("--pink").trim(),
    orange: styles.getPropertyValue("--orange").trim(),
    yellow: styles.getPropertyValue("--yellow").trim(),
    lime: styles.getPropertyValue("--lime").trim(),
    cyan: styles.getPropertyValue("--cyan").trim(),
  };
}

function bounds(values) {
  let min = Math.min(...values, 0);
  let max = Math.max(...values, 0);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12;
  return [min - pad, max + pad];
}

function drawVectorArrow(ctx, x1, y, x2, color, alpha = 1) {
  const distance = x2 - x1;
  const direction = Math.sign(distance);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;

  if (direction === 0 || Math.abs(distance) < 8) {
    ctx.beginPath();
    ctx.arc(x1, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const shaftHeight = 4;
  const headLength = 12;
  const headHeight = 14;

  const arrowLength = Math.abs(distance);
  const usableHeadLength = Math.min(headLength, arrowLength * 0.55);
  const baseX = x2 - direction * usableHeadLength;

  ctx.beginPath();
  ctx.moveTo(x1, y - shaftHeight / 2);
  ctx.lineTo(baseX, y - shaftHeight / 2);
  ctx.lineTo(baseX, y - headHeight / 2);
  ctx.lineTo(x2, y);
  ctx.lineTo(baseX, y + headHeight / 2);
  ctx.lineTo(baseX, y + shaftHeight / 2);
  ctx.lineTo(x1, y + shaftHeight / 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawMotionDiagram() {
  const { ctx, w, h } = resizeCanvas($("#motionCanvas"));
  const c = colors();
  ctx.clearRect(0, 0, w, h);

  const trajectory = sampleTimes().map((t) => motionAt(t).p);
  const [min, max] = bounds(trajectory);
  const left = 42;
  const right = w - 42;
  const lineY = h * 0.58;
  const xFor = (position) => left + ((position - min) / (max - min)) * (right - left);
  const now = motionAt(state.time);

  const roughStep = (max - min) / Math.max(4, Math.min(8, Math.floor(w / 115)));
  const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const fraction = roughStep / power;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
  const startTick = Math.ceil(min / step) * step;
  const endTick = Math.floor(max / step) * step;

  ctx.strokeStyle = "rgba(255, 255, 255, .62)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(left, lineY);
  ctx.lineTo(right, lineY);
  ctx.stroke();

  ctx.fillStyle = c.muted;
  ctx.strokeStyle = "rgba(255, 255, 255, .42)";
  ctx.font = "9px Space Mono";
  ctx.textAlign = "center";
  for (let value = startTick; value <= endTick + step * 0.001; value += step) {
    const tickX = xFor(value);
    ctx.beginPath();
    ctx.moveTo(tickX, lineY - 6);
    ctx.lineTo(tickX, lineY + 6);
    ctx.stroke();
    ctx.fillText(`${pretty(value, Math.abs(value % 1) < 0.001 ? 0 : 1)} m`, tickX, lineY + 23);
  }

  const x = xFor(now.p);
  const direction = Math.abs(now.v) < VELOCITY_ZERO_EPSILON ? 0 : Math.sign(now.v);
  if (direction !== 0) {
    const arrowLength = Math.max(
      VELOCITY_ARROW_MIN,
      Math.min(VELOCITY_ARROW_MAX, Math.abs(now.v) * VELOCITY_ARROW_SCALE)
    );
    const arrowEnd = Math.max(left, Math.min(right, x + direction * arrowLength));
    drawVectorArrow(ctx, x, lineY, arrowEnd, c.lime, 0.92);

    ctx.fillStyle = c.lime;
    ctx.font = "700 11px 'Space Mono'";
    ctx.textAlign = "center";
    ctx.fillText(`v = ${pretty(now.v)} m/s`, (x + arrowEnd) / 2, lineY - 16);
  }

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = c.pink;
  ctx.beginPath();
  ctx.arc(x, lineY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = c.pink;
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, lineY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

}
  
function drawGraph(canvas, valueFn, color) {
  const { ctx, w, h } = resizeCanvas(canvas);
  const c = colors();
  const pad = { l: 48, r: 14, t: 16, b: 32 };

  const points = Array.from({ length: 101 }, (_, i) => {
    const t = (i / 100) * state.duration;
    return { t, value: valueFn(t) };
  });
  const sampledPoints = sampleTimes().map((t) => ({ t, value: valueFn(t) }));

  const raw = bounds(sampledPoints.map((d) => d.value));

  const range = raw[1] - raw[0];
  const step = Math.pow(10, Math.floor(Math.log10(range / 5)));

  const niceStep = (() => {
      const r = (range / 5) / step;
      if (r <= 1) return step;
      if (r <= 2) return 2 * step;
      if (r <= 5) return 5 * step;
      return 10 * step;
  })();

  const min = Math.floor(raw[0] / niceStep) * niceStep;
  const max = Math.ceil(raw[1] / niceStep) * niceStep;
  const x = (t) => pad.l + (t / state.duration) * (w - pad.l - pad.r);
  const y = (value) => pad.t + ((max - value) / (max - min)) * (h - pad.t - pad.b);

  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
  ctx.lineWidth = 0.6;
  ctx.setLineDash([]);
  ctx.fillStyle = c.muted;
  ctx.font = "12px 'STIX Two Math', 'Times New Roman', serif";

  const timeDivisions = 4;
  for (let i = 0; i <= timeDivisions; i++) {
    const tx = (i / timeDivisions) * state.duration;
    ctx.beginPath();
    ctx.moveTo(x(tx), pad.t);
    ctx.lineTo(x(tx), h - pad.b);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillText(pretty(tx, 0), x(tx), h - 10);
  }

  const divisions = 4;

  for (let i = 0; i <= divisions; i++) {
    const val = max - (i / divisions) * (max - min);
    ctx.beginPath();
    ctx.moveTo(pad.l, y(val));
    ctx.lineTo(w - pad.r, y(val));
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(pretty(val, 1), pad.l - 5, y(val) + 3);
  }

  ctx.restore();

  const horizontalAxisY = min <= 0 && max >= 0 ? y(0) : h - pad.b;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, h - pad.b);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pad.l, horizontalAxisY);
  ctx.lineTo(w - pad.r, horizontalAxisY);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.beginPath();
  points.forEach((point, i) => {
    if (i) ctx.lineTo(x(point.t), y(point.value));
    else ctx.moveTo(x(point.t), y(point.value));
  });
  ctx.stroke();

  const currentX = x(state.time);
  const currentY = y(valueFn(state.time));

  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = c.pink;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(currentX, pad.t);
  ctx.lineTo(currentX, h - pad.b);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(currentX, currentY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = color;
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function updateUI() {
  const now = motionAt(state.time);
  $("#positionValue").textContent = `${pretty(state.p0, 1)} m`;
  $("#velocityValue").textContent = `${pretty(state.v0, 1)} m/s`;
  $("#accelerationValue").textContent = `${pretty(state.a, 2)} m/s²`;
  $("#durationValue").textContent = `${state.duration} s`;
  $("#timeReadout").textContent = `${pretty(state.time)} s`;
  $("#positionReadout").textContent = `${pretty(now.p)} m`;
  $("#velocityReadout").textContent = `${pretty(now.v)} m/s`;
  $("#accelerationReadout").textContent = `${pretty(now.a)} m/s²`;
  $("#playText").textContent = state.time >= state.duration ? "Replay motion" : "Play motion";
  $("#playIcon").textContent = "▶";
  $("#pauseButton").disabled = !state.playing;
  drawMotionDiagram();
  const c = colors();
  drawGraph($("#positionGraph"), (t) => motionAt(t).p, c.cyan);
  drawGraph($("#velocityGraph"), (t) => motionAt(t).v, c.lime);
  drawGraph($("#accelerationGraph"), () => state.a, c.yellow);
}

function syncFromControls() {
  state.p0 = Number(controls.p0.value);
  state.v0 = Number(controls.v0.value);
  state.a = Number(controls.a.value);
  state.duration = Number(controls.duration.value);
  state.time = Math.min(state.time, state.duration);
  state.playing = false;
  $("#presetSelect").value = "";
  updateUI();
}

Object.values(controls).forEach((control) => control.addEventListener("input", syncFromControls));
$("#presetSelect").addEventListener("change", (event) => {
  const preset = presets[event.target.value];
  if (!preset) return;
  Object.assign(state, preset, { time: 0, playing: false });
  controls.p0.value = preset.p0;
  controls.v0.value = preset.v0;
  controls.a.value = preset.a;
  controls.duration.value = preset.duration;
  updateUI();
});

$("#playButton").addEventListener("click", () => {
  if (state.time >= state.duration) state.time = 0;
  state.playing = true;
  state.lastFrame = null;
  updateUI();
});
$("#pauseButton").addEventListener("click", () => { state.playing = false; updateUI(); });
$("#resetButton").addEventListener("click", () => { state.time = 0; state.playing = false; updateUI(); });
$("#themeButton").addEventListener("click", () => { document.body.classList.toggle("dark"); updateUI(); });

function animate(timestamp) {
  if (state.playing) {
    if (state.lastFrame !== null) state.time += (timestamp - state.lastFrame) / 1000;
    state.lastFrame = timestamp;
    if (state.time >= state.duration) { state.time = state.duration; state.playing = false; }
    updateUI();
  } else state.lastFrame = null;
  requestAnimationFrame(animate);
}

window.addEventListener("resize", updateUI);
document.fonts.ready.then(updateUI);
requestAnimationFrame(animate);
