"use strict";

const firstReleaseAt = 6.15;
const openRiverAt = 15.6;

const roles = [
  {
    id: "traveler", location: "城郊", name: "赶路人",
    x: 79.79, y: 82.5, label: "沿汴河往城里走", entry: "跟赶路人沿汴河往城里走",
    fact: "画卷前段表现汴京城郊。道路穿过田野与低矮屋舍，路上可见往来的人物。",
    staging: "土路、屋舍和沿河行旅取意于画卷。短场景里的行进路线是艺术演绎。"
  },
  {
    id: "boatman", location: "虹桥", name: "船工",
    x: 51.62, y: 30.5, label: "随漕船驶出虹桥", entry: "跟船工驶出虹桥",
    fact: "桥下的漕船正放倒桅杆，准备穿过桥孔。船工忙着操作，桥上有人驻足观看。",
    staging: "画中船工放低桅杆的动作是设计依据。甲板上的视线和放桅的节奏是情景演绎。"
  },
  {
    id: "shopkeeper", location: "街市", name: "店伙计",
    x: 15.83, y: 43, label: "沿柜台走到铺口", entry: "跟店伙计走到铺口",
    fact: "长卷后段描绘临街商铺与穿行其间的人物。沿街店面与道路直接相连。",
    staging: "在柜台后看到客人驻足，是根据画中街市和店铺设计的情景。客人的动作和布棚的变化属于情景演绎。"
  }
];

const journeys = {
  traveler: {
    duration: 27,
    // Seconds, center in the painting (%), and camera scale.
    camera: [[0, 42.5, 58.6, 1.26], [5.5, 42.5, 56.6, 1.37], [12, 44, 54.2, 1.54], [19, 46.3, 51.6, 1.72], [27, 49, 48.8, 1.89]],
    captions: [
      [0, "柳影落在土路上，河水沿岸流过。"],
      [9, "沿着河湾转过去，一艘小船静静靠在岸边。"],
      [18, "前面的屋舍渐密，路上的行人多了些。"]
    ]
  },
  boatman: {
    duration: 23,
    camera: [[0, 49, 48, 1.16], [5, 50, 51, 1.19], [10, 50.5, 54, 1.22], [14, 51, 53, 1.23], [19, 52, 51, 1.23], [23, 52.5, 51, 1.24]],
    shore: [[0, 0, 0, 1], [5, .4, -.6, 1.12], [10, -.9, -3, 1.36], [14, -2, -6.6, 1.72], [18.8, -3, -10.5, 2.01], [23, -3.4, -11.3, 2.13]],
    mast: [
      [0, 0], [firstReleaseAt, 0], [7.35, -2.3],
      [9.25, -2.3], [10.6, -4.6], [12.42, -4.6], [13.7, -7],
    ],
    light: [[0, 1], [5, .88], [12, .9], [14, .95], [18.8, 1.07], [23, 1.07]],
    phases: [0, firstReleaseAt, openRiverAt],
    captions: [
      [0, "你站在甲板上，木梁从头顶掠过，船身随水轻晃。"],
      [firstReleaseAt, "同伴分几次松绳，桅杆一寸寸放低。"],
      [openRiverAt, "船出了桥洞。水面亮起来，另一艘小船从前方驶过。"]
    ]
  },
  shopkeeper: {
    duration: 22,
    camera: [[0, 46.5, 57.1, 1.15], [5, 46, 55.3, 1.18], [10, 51, 51, 1.30], [16, 58, 49.1, 1.50], [22, 63.5, 47.9, 1.64]],
    captions: [
      [0, "对街的摊子冒着热气，一辆推车从布棚外经过。"],
      [6, "柜台前的客人扶稳篮子。你沿着柜台走向铺口。"],
      [15, "你站到铺口，望着街边的人往虹桥方向走去。"]
    ]
  }
};
for (const [id, fields] of Object.entries(window.sceneJourneyEnhancements ?? {})) {
  Object.assign(journeys[id], fields);
}

const $ = (id) => document.getElementById(id);
const viewport = $("viewport");
const world = $("world");
const image = $("scroll-image");
const range = $("map-range");
const scene = $("scene");
const evidence = $("evidence");
const currentEntry = $("enter-current");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const visited = new Set();
let activeRole;
let evidenceRole;
let evidenceTrigger;
let playing = null;
let worldRatio = 21.333;
let initialized = false;
let drag = null;
let scrollFrame = 0;

for (const role of roles) {
  const hotspot = document.createElement("div");
  hotspot.className = "hotspot";
  hotspot.style.left = `${role.x}%`;
  hotspot.style.top = `${role.y}%`;
  const enter = document.createElement("button");
  enter.className = "hotspot-enter";
  enter.type = "button";
  enter.setAttribute("aria-label", `进入${role.name}视角`);
  enter.innerHTML = `<span class="marker" aria-hidden="true"></span><span class="marker-name">${role.name}</span>`;
  enter.addEventListener("click", () => openScene(role, enter));
  const details = document.createElement("button");
  details.className = "evidence-button";
  details.type = "button";
  details.hidden = true;
  details.textContent = "原画依据";
  details.setAttribute("aria-label", `查看${role.name}的原画依据`);
  details.addEventListener("click", () => showEvidence(role, details));
  role.hotspot = hotspot;
  role.enter = enter;
  role.details = details;
  hotspot.append(enter, details);
  $("hotspots").append(hotspot);

  const card = document.createElement("button");
  card.className = "person";
  card.type = "button";
  card.innerHTML = `<span>${role.name}</span><small>${role.location} · ${role.label}</small><span class="arrow" aria-hidden="true">↗</span>`;
  card.addEventListener("click", () => openScene(role, card));
  role.card = card;
  $("people-list").append(card);
}

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => goTo(roles.find((role) => role.id === button.dataset.go), "instant"));
});
currentEntry.addEventListener("click", () => openScene(activeRole ?? roles[0], currentEntry));

const limit = () => Math.max(0, viewport.scrollWidth - viewport.clientWidth);

function goTo(role, behavior) {
  const position = world.clientWidth * role.x / 100 - viewport.clientWidth / 2;
  viewport.scrollTo({ left: position, behavior });
  if (behavior === "instant") updateViewport();
}

function updateViewport() {
  scrollFrame = 0;
  const width = viewport.scrollWidth;
  if (!width) return;
  const left = viewport.scrollLeft;
  const visible = viewport.clientWidth;
  const center = (left + visible / 2) * 100 / width;
  const active = roles.reduce((closest, role) => Math.abs(role.x - center) < Math.abs(closest.x - center) ? role : closest);
  $("viewfinder").style.left = `${left / width * 100}%`;
  $("viewfinder").style.width = `${visible / width * 100}%`;
  range.value = String(Math.round(limit() ? left / limit() * 1000 : 0));
  range.setAttribute("aria-valuetext", active.location);
  $("move-left").disabled = left <= 1;
  $("move-right").disabled = left >= limit() - 1;
  if (active === activeRole) return;
  activeRole = active;
  $("enter-current-label").textContent = active.entry;
  $("current-location").textContent = `${active.location} · ${active.name}`;
  document.querySelectorAll("[data-go]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.go === active.id));
  });
  roles.forEach(role => {
    role.hotspot.dataset.active = role.card.dataset.active = String(role === active);
  });
}

function sizeWorld() {
  const previous = world.clientWidth;
  const fraction = previous ? (viewport.scrollLeft + viewport.clientWidth / 2) / previous : 1;
  world.style.width = `${Math.round(viewport.clientHeight * worldRatio)}px`;
  if (!initialized) {
    goTo(roles[0], "instant");
    initialized = true;
  } else {
    viewport.scrollLeft = world.clientWidth * fraction - viewport.clientWidth / 2;
    updateViewport();
  }
}

function initializePainting() {
  worldRatio = image.naturalWidth / image.naturalHeight;
  sizeWorld();
  window.installScrollPeople?.(world, image);
}

viewport.addEventListener("scroll", () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateViewport);
}, { passive: true });
viewport.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0 || event.target.closest("button")) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, moving: false };
  viewport.setPointerCapture(event.pointerId);
});
viewport.addEventListener("pointermove", (event) => {
  if (drag?.id !== event.pointerId) return;
  const distance = event.clientX - drag.x;
  if (!drag.moving && Math.abs(distance) < Math.max(5, Math.abs(event.clientY - drag.y))) return;
  drag.moving = true;
  viewport.classList.add("dragging");
  viewport.scrollLeft = drag.left - distance;
});
function stopDrag(event) {
  if (drag?.id !== event.pointerId) return;
  drag = null;
  viewport.classList.remove("dragging");
}
for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
  viewport.addEventListener(name, stopDrag);
}

const step = (direction) => viewport.scrollBy({
  left: direction * viewport.clientWidth * .66,
  behavior: reduceMotion.matches ? "instant" : "smooth"
});
$("move-left").addEventListener("click", () => step(-1));
$("move-right").addEventListener("click", () => step(1));
range.addEventListener("input", () => { viewport.scrollLeft = Number(range.value) / 1000 * limit(); });
viewport.addEventListener("keydown", (event) => {
  if (event.target !== viewport) return;
  switch (event.key) {
    case "ArrowLeft": step(-1); break;
    case "ArrowRight": step(1); break;
    case "Home": viewport.scrollLeft = limit(); break;
    case "End": viewport.scrollLeft = 0; break;
    default: return;
  }
  event.preventDefault();
});

const stage = $("scene-stage");
const sceneLook = $("scene-look");
const sceneWorld = $("scene-world");
const pauseButton = $("scene-pause");
const sceneEvidence = $("scene-evidence");
const scenePhases = $("scene-phases");
const evidenceCrop = $("evidence-crop");
const evidenceStill = $("evidence-still");
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
let lookDrag = null;

function openScene(role, trigger) {
  if (playing || scene.open || evidence.open) return;
  if (trigger !== role.enter) goTo(role, "instant");
  const route = journeys[role.id];
  playing = {
    role, route, trigger, left: viewport.scrollLeft, elapsed: 0, lastTime: 0, frame: 0,
    lookX: 0, lookY: 0, paused: false, caption: "", phase: -1,
  };
  if (!reduceMotion.matches) role.hotspot.classList.add("entering");
  stage.dataset.role = role.id;
  sceneLook.tabIndex = reduceMotion.matches ? -1 : 0;
  const art = role.id === "boatman" ? "boat-deck" : role.id;
  $("scene-art").style.backgroundImage = `url("./assets/${art}.webp")`;
  $("scene-title").textContent = role.name;
  $("scene-location").textContent = role.location + " · 第一人称";
  $("scene-hint").textContent = reduceMotion.matches ? "" : "拖动画面可环顾";
  scenePhases.hidden = !route.phases;
  scene.returnValue = "";
  scene.showModal();
  document.body.classList.add("modal-open");
  measureScene();
  updateSceneControls();
  resumeJourney();
}

function sample(track, elapsed) {
  const end = track.findIndex(([second]) => second > elapsed);
  if (end < 0) return track.at(-1).slice(1);
  const [from, ...start] = track[end - 1];
  const [to, ...finish] = track[end];
  const ratio = (elapsed - from) / (to - from);
  const mix = ratio * ratio * (3 - 2 * ratio);
  return start.map((value, i) => value + (finish[i] - value) * mix);
}

function sampleCamera(track, elapsed) {
  const end = track.findIndex(([second]) => second > elapsed);
  if (end < 0) return track.at(-1).slice(1);
  const start = track[end - 1];
  const finish = track[end];
  const before = track[Math.max(0, end - 2)];
  const after = track[Math.min(track.length - 1, end + 1)];
  const span = finish[0] - start[0];
  const t = (elapsed - start[0]) / span;
  const squared = t * t;
  const smooth = squared * (3 - 2 * t);
  return start.slice(1).map((value, axis) => {
    const index = axis + 1;
    if (value === finish[index]) return value;
    const startSlope = value === before[index] ? 0 : (finish[index] - before[index]) / (finish[0] - before[0]);
    const endSlope = finish[index] === after[index] ? 0 : (after[index] - value) / (after[0] - start[0]);
    return value + (finish[index] - value) * smooth
      + (startSlope * t * (1 - t) ** 2 - endSlope * squared * (1 - t)) * span;
  });
}

function measureScene() {
  if (!playing || !scene.open) return;
  playing.width = stage.clientWidth;
  playing.height = stage.clientHeight;
  playing.artWidth = sceneWorld.offsetWidth;
  playing.artHeight = sceneWorld.offsetHeight;
  drawJourney(playing);
}

function drawJourney(run) {
  const { route, elapsed, width, height, artWidth, artHeight } = run;
  const motionTime = reduceMotion.matches ? 0 : elapsed;
  const [pathX, y, scale] = sampleCamera(route.camera, motionTime);
  const role = run.role.id;
  const roadBias = role === "traveler" ? clamp((.82 - width / Math.max(artWidth, 1)) * 16, 0, 9) : 0;
  const envelope = Math.min(1, motionTime / 1.5, (route.duration - motionTime) / 2.5);
  const [walkStart, walkEnd] = route.walkWindow ?? [0, route.duration];
  const step = clamp(Math.min((motionTime - walkStart) / 1.25, (walkEnd - motionTime) / 1.4), 0, 1);
  const [firstStep, stepInterval] = route.stepTiming ?? [0, 1 / 1.66];
  const gait = (motionTime - firstStep) * Math.PI / stepInterval;
  let side = 0;
  let rise = 0;
  let roll = 0;
  let pitch = 0;
  if (role === "traveler") {
    side = Math.sin(gait) * .0045 * height * step;
    rise = (Math.cos(gait * 2) - .18 * Math.cos(gait * 4)) * .006 * height * step;
    roll = Math.sin(gait) * .29 * step;
    pitch = (scale - route.camera[0][3]) * 5.5 + Math.sin(gait * 2) * .24 * step;
  } else if (role === "boatman") {
    side = Math.sin(motionTime * 1.28) * .005 * height * envelope;
    rise = Math.cos(motionTime * 1.62) * .005 * height * envelope;
    roll = Math.sin(motionTime * 1.5) * .43 * envelope;
    pitch = Math.sin(motionTime * 1.14) * .45 * envelope;
  } else {
    side = Math.sin(gait) * .0031 * height * step;
    rise = Math.cos(gait * 2) * .0046 * height * step;
    roll = Math.sin(gait) * .19 * step;
    pitch = Math.sin(motionTime * .75) * .24 * envelope;
  }
  // Keep the artwork beyond the viewport when roll or perspective pulls a corner inward.
  const edge = (Math.abs(roll) * .7 + Math.abs(pitch) * .34)
    * Math.PI / 180 * Math.max(width, height) + 3;
  const marginX = Math.max(0, (artWidth * scale - width) / 2 - edge);
  const marginY = Math.max(0, (artHeight * scale - height) / 2 - edge);
  const cameraX = (50 - pathX + roadBias) * artWidth * scale / 100 + artWidth * run.lookX / 100 + side;
  const cameraY = (50 - y) * artHeight * scale / 100 + height * run.lookY / 100 + rise;
  stage.style.setProperty("--move-x", `${clamp(cameraX, -marginX, marginX).toFixed(2)}px`);
  stage.style.setProperty("--move-y", `${clamp(cameraY, -marginY, marginY).toFixed(2)}px`);
  stage.style.setProperty("--zoom", scale.toFixed(4));
  stage.style.setProperty("--scene-roll", `${roll.toFixed(3)}deg`);
  stage.style.setProperty("--scene-pitch", `${pitch.toFixed(3)}deg`);
  if (route.light) stage.style.setProperty("--boat-light", sample(route.light, motionTime)[0].toFixed(3));
  const view = { panX: run.lookX / 14, panY: run.lookY / 9, progress: motionTime / route.duration };
  if (role === "traveler") {
    window.drawRoadAtmosphere?.(sceneWorld, motionTime, view);
    window.drawTravelerPeople?.(sceneWorld, motionTime);
  } else if (role === "boatman") {
    const shore = window.drawBoatView?.(sceneWorld, sampleCamera(route.shore, motionTime));
    let grip;
    if (shore) {
      window.drawRiverAtmosphere?.(shore, motionTime, view);
      window.drawRiverTraffic?.(shore, motionTime);
      grip = window.drawBoatPeople?.(sceneWorld, motionTime);
    }
    const [mastAngle] = sample(route.mast, motionTime);
    window.drawBoatRig?.(sceneWorld, mastAngle, grip);
  } else {
    window.drawShopPeople?.(sceneWorld, motionTime, view);
  }
  const caption = route.captions.findLast(([time]) => time <= elapsed)[1];
  if (caption !== run.caption) {
    run.caption = caption;
    $("scene-caption").textContent = caption;
  }
  if (route.phases) {
    const phase = route.phases.findLastIndex(time => time <= elapsed);
    if (phase !== run.phase) {
      run.phase = phase;
      Array.from(scenePhases.children).forEach((item, index) => {
        if (index === phase) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
      });
    }
  }
}

function updateSceneControls() {
  const { paused, elapsed, route } = playing;
  const ended = elapsed >= route.duration;
  stage.dataset.paused = String(paused || ended);
  pauseButton.textContent = ended ? "再体验" : paused ? "继续前行" : "停留片刻";
  sceneEvidence.hidden = !ended;
  $("scene-hint").hidden = ended;
}

function advanceJourney(now) {
  const run = playing;
  if (!run || run.paused || !scene.open) return;
  const delta = run.lastTime ? Math.min(now - run.lastTime, 100) / 1000 : 0;
  run.lastTime = now;
  run.elapsed = Math.min(run.elapsed + delta, run.route.duration);
  drawJourney(run);
  if (run.elapsed >= run.route.duration) {
    run.frame = 0;
    updateSceneControls();
  } else {
    run.frame = requestAnimationFrame(advanceJourney);
  }
}

function resumeJourney() {
  playing.paused = false;
  playing.lastTime = 0;
  updateSceneControls();
  playing.frame = requestAnimationFrame(advanceJourney);
}

function toggleJourney() {
  if (!playing || !scene.open) return;
  const run = playing;
  if (run.elapsed >= run.route.duration) {
    run.elapsed = run.lookX = run.lookY = 0;
    drawJourney(run);
    resumeJourney();
  } else if (run.paused) {
    resumeJourney();
  } else {
    run.paused = true;
    cancelAnimationFrame(run.frame);
    updateSceneControls();
  }
}

pauseButton.addEventListener("click", toggleJourney);
sceneEvidence.addEventListener("click", () => scene.close("evidence"));
sceneLook.addEventListener("pointerdown", (event) => {
  if (!playing || lookDrag || event.button !== 0 || reduceMotion.matches) return;
  lookDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: playing.lookX, startY: playing.lookY };
  sceneLook.setPointerCapture(event.pointerId);
  sceneLook.classList.add("looking");
});
sceneLook.addEventListener("pointermove", (event) => {
  if (!playing || lookDrag?.id !== event.pointerId) return;
  playing.lookX = clamp(lookDrag.startX + (event.clientX - lookDrag.x) * 40 / playing.width, -14, 14);
  playing.lookY = clamp(lookDrag.startY + (event.clientY - lookDrag.y) * 45 / playing.height, -9, 9);
  drawJourney(playing);
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  sceneLook.addEventListener(type, (event) => {
    if (lookDrag?.id !== event.pointerId) return;
    lookDrag = null;
    sceneLook.classList.remove("looking");
  });
}
sceneLook.addEventListener("keydown", (event) => {
  if (!playing) return;
  if (event.code === "Space") {
    event.preventDefault();
    if (!event.repeat) toggleJourney();
    return;
  }
  if (reduceMotion.matches) return;
  switch (event.key) {
    case "ArrowLeft": playing.lookX = clamp(playing.lookX + 2, -14, 14); break;
    case "ArrowRight": playing.lookX = clamp(playing.lookX - 2, -14, 14); break;
    case "ArrowUp": playing.lookY = clamp(playing.lookY + 2, -9, 9); break;
    case "ArrowDown": playing.lookY = clamp(playing.lookY - 2, -9, 9); break;
    default: return;
  }
  event.preventDefault();
  drawJourney(playing);
});

new ResizeObserver(measureScene).observe(stage);
$("scene-back").addEventListener("click", () => scene.close());
scene.addEventListener("close", () => {
  if (!playing) return;
  const { role, frame, left, trigger } = playing;
  const compare = scene.returnValue === "evidence";
  cancelAnimationFrame(frame);
  lookDrag = null;
  sceneLook.classList.remove("looking");
  role.hotspot.classList.remove("entering");
  playing = null;
  document.body.classList.remove("modal-open");
  viewport.scrollLeft = left;
  if (!visited.has(role.id)) {
    visited.add(role.id);
    role.details.hidden = false;
  }
  updateViewport();
  if (compare) showEvidence(role, trigger);
  else trigger?.focus({ preventScroll: true });
});

function showEvidence(role, trigger) {
  if (scene.open || evidence.open) return;
  evidenceRole = role;
  evidenceTrigger = trigger;
  $("evidence-title").textContent = `${role.location} · ${role.name}的原画依据`;
  $("evidence-fact").textContent = role.fact;
  $("evidence-scene").textContent = role.staging;
  evidenceStill.src = `./assets/${role.id}.webp`;
  evidenceStill.alt = `${role.name}视角的场景演绎`;
  evidence.showModal();
  document.body.classList.add("modal-open");
  layoutEvidence();
}

function layoutEvidence() {
  if (!evidence.open || !evidenceRole) return;
  const role = evidenceRole;
  const cropImage = evidenceCrop.querySelector("img");
  const cropWidth = evidenceCrop.clientHeight * worldRatio;
  cropImage.style.width = `${cropWidth}px`;
  cropImage.style.left = `${evidenceCrop.clientWidth / 2 - cropWidth * role.x / 100}px`;
  evidenceCrop.querySelector(".evidence-pin").style.top = `${role.y}%`;
}

new ResizeObserver(layoutEvidence).observe(evidenceCrop);
evidence.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  evidenceTrigger?.focus({ preventScroll: true });
  evidenceRole = evidenceTrigger = null;
});

new ResizeObserver(sizeWorld).observe(viewport);
if (image.complete && image.naturalWidth) {
  initializePainting();
} else {
  image.addEventListener("load", initializePainting, { once: true });
}

for (const role of roles) {
  const preloader = new Image();
  const art = role.id === "boatman" ? "boat-deck" : role.id;
  preloader.src = `./assets/${art}.webp`;
}
