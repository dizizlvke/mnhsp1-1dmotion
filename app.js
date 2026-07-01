const $ = (selector) => document.querySelector(selector);

const controls = {
  p0: $("#position"),
  v0: $("#velocity"),
  a: $("#acceleration"),
  duration: $("#duration"),
};

const presets = {
  cruise: { p0: 0, v0: 2, a: 0, duration: 8 },
  speedup: { p0: -4, v0: 0.5, a: 1, duration: 8 },
  brake: { p0: 0, v0: 6, a: -1, duration: 8 },
  reverse: { p0: 6, v0: -1, a: -0.5, duration: 8 },
};

const state = { ...presets.cruise, time: 0, playing: false, lastFrame: null };
const canvases = [$("#motionCanvas"), $("#positionGraph"), $("#velocityGraph"), $("#accelerationGraph")];

function motionAt(t) {
  return {
    p: state.p0 + state.v0 * t + 0.5 * state.a * t * t,
    v: state.v0 + state.a * t,
    a: state.a,
  };
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
  const direction = Math.sign(x2 - x1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.3;
  ctx.lineCap = "round";
  if (direction === 0 || Math.abs(x2 - x1) < 4) {
    ctx.beginPath(); ctx.arc(x1, y, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y);
  ctx.lineTo(x2 - direction * 7, y - 4.5);
  ctx.lineTo(x2 - direction * 7, y + 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMotionDiagram() {
  const { ctx, w, h } = resizeCanvas($("#motionCanvas"));
  const c = colors();
  ctx.clearRect(0, 0, w, h);
  const intervalSamples = Array.from({ length: Math.floor(state.duration) + 1 }, (_, t) => ({ t, ...motionAt(t) }));
  if (intervalSamples.at(-1).t !== state.duration) intervalSamples.push({ t: state.duration, ...motionAt(state.duration) });
  const allPositions = intervalSamples.map((sample) => sample.p).concat(motionAt(state.time).p);
  const [min, max] = bounds(allPositions);
  const left = Math.min(92, w * 0.18), right = w - 28;
  const diagramTop = 40;
  const rowGap = 72;

  const accelerationY = diagramTop;
  const velocityY = diagramTop + rowGap;
  const positionY = diagramTop + rowGap * 2; 
  const axisY = diagramTop + rowGap * 3;
  const xFor = (p) => left + ((p - min) / (max - min)) * (right - left);

  // Row labels
  ctx.textAlign = "left";
  ctx.font = "italic 15px 'STIX Two Math', 'Times New Roman', serif";
  ctx.fillStyle = c.orange; ctx.fillText("a(t)", 14, accelerationY + 4);
  ctx.fillStyle = c.lime; ctx.fillText("v̄", 14, velocityY + 4);
  ctx.fillStyle = c.cyan; ctx.fillText("p(t)", 14, positionY + 4);
  ctx.font = "8px Space Mono";
  ctx.fillStyle = c.muted;
  ctx.fillText("AT DOTS", 14, accelerationY + 18);
  ctx.fillText("OVER GAPS", 14, velocityY + 18);
  ctx.fillText("POSITION", 14, positionY + 18);

  // Vertical time guides aligned with every position dot.
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, .18)";
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 5]);
  intervalSamples.forEach((sample) => {
    const x = xFor(sample.p);
    ctx.beginPath(); ctx.moveTo(x, 22); ctx.lineTo(x, positionY + 48); ctx.stroke();
  });
  ctx.restore();

  // Position path and directional arrows between successive dots.
  for (let i = 0; i < intervalSamples.length - 1; i++) {
    const x1 = xFor(intervalSamples[i].p);
    const x2 = xFor(intervalSamples[i + 1].p);
    const inset = Math.min(8, Math.abs(x2 - x1) * 0.16) * Math.sign(x2 - x1);
    drawVectorArrow(ctx, x1 + inset, positionY, x2 - inset, c.ink, 0.7);
  }

  // Acceleration vectors originate at the dots.
  intervalSamples.forEach((sample) => {
    const x = xFor(sample.p);
    const direction = Math.sign(sample.a);
    const length = direction === 0 ? 0 : direction * Math.min(46, 18 + Math.abs(sample.a) * 7);
    drawVectorArrow(ctx, x, accelerationY, x + length, c.orange, 0.78);
    ctx.fillStyle = c.orange;
    ctx.textAlign = "center";
    ctx.font = "italic 11px 'STIX Two Math', 'Times New Roman', serif";
    ctx.fillText(direction === 0 ? "a = 0" : "a", x, accelerationY - 11);
  });

  // Average velocity vectors are centered over the gaps between dots.
  for (let i = 0; i < intervalSamples.length - 1; i++) {
    const first = intervalSamples[i], second = intervalSamples[i + 1];
    const x1 = xFor(first.p), x2 = xFor(second.p);
    const midpoint = (x1 + x2) / 2;
    const velocity = motionAt((first.t + second.t) / 2).v;
    const direction = Math.sign(velocity);
    const length = direction === 0 ? 0 : direction * Math.min(54, Math.max(15, Math.abs(x2 - x1) * 0.58));
    drawVectorArrow(ctx, midpoint - length / 2, velocityY, midpoint + length / 2, c.lime, 0.75);
    ctx.fillStyle = c.lime;
    ctx.textAlign = "center";
    ctx.font = "italic 11px 'STIX Two Math', 'Times New Roman', serif";
    ctx.fillText(`v̄${i + 1}`, midpoint, velocityY - 12);
  }

  // Position dots and their mathematical time/position labels.
  const acceptedLabelXs = [];
  intervalSamples.forEach((sample, index) => {
    const x = xFor(sample.p);
    ctx.fillStyle = c.cyan;
    ctx.globalAlpha = 0.88;
    ctx.beginPath(); ctx.arc(x, positionY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    const canLabel = index === 0 || index === intervalSamples.length - 1 || acceptedLabelXs.every((labelX) => Math.abs(labelX - x) > 54);
    if (canLabel) {
      acceptedLabelXs.push(x);
      ctx.fillStyle = c.ink;
      ctx.textAlign = "center";
      ctx.font = "12px 'STIX Two Math', 'Times New Roman', serif";
      ctx.fillText(`t = ${pretty(sample.t, 0)} s`, x, positionY + 24);
      ctx.fillStyle = c.muted;
      ctx.font = "10px 'STIX Two Math', 'Times New Roman', serif";
      ctx.fillText(`(${pretty(sample.p, 1)} m)`, x, positionY + 39);
    }
  });

  // The animated object remains visible as a pink playhead on the position row.
  const now = motionAt(state.time);
  const x = xFor(now.p);
  ctx.fillStyle = c.pink;
  ctx.beginPath(); ctx.arc(x, positionY, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, positionY, 12, 0, Math.PI * 2); ctx.stroke();
}

function drawGraph(canvas, valueFn, color, options = {}) {
  const { ctx, w, h } = resizeCanvas(canvas);
  const c = colors();
  const pad = { l: 38, r: 12, t: 14, b: 28 };
  const points = Array.from({ length: 101 }, (_, i) => {
    const t = (i / 100) * state.duration;
    return { t, value: valueFn(t) };
  });
  const [min, max] = bounds(points.map((d) => d.value));
  const x = (t) => pad.l + (t / state.duration) * (w - pad.l - pad.r);
  const y = (value) => pad.t + ((max - value) / (max - min)) * (h - pad.t - pad.b);
  ctx.clearRect(0, 0, w, h);

  // Secondary grid: intentionally quiet so the data and main axes stay dominant.
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 0.65;
  ctx.setLineDash([3, 5]);
  ctx.fillStyle = c.muted;
  ctx.font = "11px 'STIX Two Math', 'Times New Roman', serif";
  for (let i = 0; i <= 4; i++) {
    const tx = (i / 4) * state.duration;
    ctx.beginPath(); ctx.moveTo(x(tx), pad.t); ctx.lineTo(x(tx), h - pad.b); ctx.stroke();
    ctx.textAlign = "center"; ctx.fillText(pretty(tx, 0), x(tx), h - 10);
  }
  for (let i = 0; i <= 3; i++) {
    const val = max - (i / 3) * (max - min);
    ctx.beginPath(); ctx.moveTo(pad.l, y(val)); ctx.lineTo(w - pad.r, y(val)); ctx.stroke();
    ctx.textAlign = "right"; ctx.fillText(pretty(val, 1), pad.l - 5, y(val) + 3);
  }
  ctx.restore();

  // Primary axes: solid white, with time on x and the measured quantity on y.
  const horizontalAxisY = min <= 0 && max >= 0 ? y(0) : h - pad.b;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.96)";
  ctx.lineWidth = 1.45;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, h - pad.b);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad.l, horizontalAxisY); ctx.lineTo(w - pad.r, horizontalAxisY); ctx.stroke();

  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
  ctx.beginPath(); points.forEach((point, i) => i ? ctx.lineTo(x(point.t), y(point.value)) : ctx.moveTo(x(point.t), y(point.value))); ctx.stroke();

  if (options.intervalMarkers) {
    ctx.save();
    ctx.fillStyle = c.pink;
    ctx.globalAlpha = 0.42;
    for (let t = 0; t <= state.duration; t += 1) {
      ctx.beginPath();
      ctx.arc(x(t), y(valueFn(t)), 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const currentX = x(state.time), currentY = y(valueFn(state.time));
  ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = c.pink; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(currentX, pad.t); ctx.lineTo(currentX, h - pad.b); ctx.stroke(); ctx.restore();
  ctx.fillStyle = c.orange; ctx.beginPath(); ctx.arc(currentX, currentY, 4, 0, Math.PI * 2); ctx.fill();
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
  $("#positionFormula").textContent = `p(t) = ${pretty(state.p0, 1)} + ${pretty(state.v0, 1)}t + ½(${pretty(state.a, 2)})t²`;
  $("#velocityFormula").textContent = `v(t) = ${pretty(state.v0, 1)} + ${pretty(state.a, 2)}t`;
  $("#playText").textContent = state.playing ? "Pause motion" : (state.time >= state.duration ? "Replay motion" : "Play motion");
  $("#playIcon").textContent = state.playing ? "Ⅱ" : "▶";
  drawMotionDiagram();
  const c = colors();
  drawGraph($("#positionGraph"), (t) => motionAt(t).p, c.cyan, { intervalMarkers: true });
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
  document.querySelectorAll(".preset").forEach((button) => button.classList.remove("active"));
  updateUI();
}

Object.values(controls).forEach((control) => control.addEventListener("input", syncFromControls));
document.querySelectorAll(".preset").forEach((button) => button.addEventListener("click", () => {
  const preset = presets[button.dataset.preset];
  Object.assign(state, preset, { time: 0, playing: false });
  controls.p0.value = preset.p0; controls.v0.value = preset.v0; controls.a.value = preset.a; controls.duration.value = preset.duration;
  document.querySelectorAll(".preset").forEach((item) => item.classList.toggle("active", item === button));
  updateUI();
}));

$("#playButton").addEventListener("click", () => {
  if (state.time >= state.duration) state.time = 0;
  state.playing = !state.playing;
  state.lastFrame = null;
  updateUI();
});
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
