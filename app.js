"use strict";

const roles = [
  {
    id: "traveler", location: "城郊", name: "赶路人",
    x: 79.79, y: 82.5, label: "沿汴河往城里走",
    fact: "画卷前段表现汴京城郊。道路穿过田野与低矮屋舍，路上可见往来的人物。",
    staging: "土路、屋舍和沿河行旅取意于画卷。短场景里的行进路线和相伴的环境声是艺术演绎。"
  },
  {
    id: "boatman", location: "虹桥", name: "船工",
    x: 51.62, y: 30.5, label: "随漕船靠近桥孔",
    fact: "桥下的漕船正放倒桅杆，准备穿过桥孔。船工忙着操作，桥上有人驻足观看。",
    staging: "画中船工放低桅杆的动作是设计依据。视线、放桅的节奏和过桥时的声响是情景演绎。"
  },
  {
    id: "shopkeeper", location: "街市", name: "店伙计",
    x: 15.83, y: 43, label: "从铺子里望向街面",
    fact: "长卷后段描绘临街商铺与穿行其间的人物。沿街店面与道路直接相连。",
    staging: "在柜台后看到客人驻足，是根据画中街市和店铺设计的情景。客人的动作、茶碗和环境声属于情景演绎。"
  }
];

const journeys = {
  traveler: {
    duration: 27,
    volume: .53,
    // Seconds, center in the painting (%), and camera scale.
    camera: [[0, 43.8, 59, 1.25], [7, 43.3, 56, 1.29], [15, 44.5, 53.5, 1.37], [27, 46.4, 51.4, 1.47]],
    captions: [
      [0, "柳影落在土路上，脚步声伴着河水。"],
      [9, "沿着河湾转过去，一艘小船静静靠在岸边。"],
      [18, "前面的屋舍渐密，路上的人声近了些。"]
    ]
  },
  boatman: {
    duration: 23,
    volume: .56,
    camera: [[0, 49, 50, 1.17], [5, 50, 45.6, 1.22], [13, 51, 54, 1.27], [23, 51, 55, 1.43]],
    mast: [[0, -134], [6, -134], [14, -162], [23, -162]],
    captions: [
      [0, "漕船顺着水势靠近虹桥，桥上的人声渐渐传过来。"],
      [7, "同伴收住绳索，让桅杆慢慢落下。"],
      [16, "船身从桥影里滑过去，眼前的水面亮起来。"]
    ]
  },
  shopkeeper: {
    duration: 22,
    volume: .55,
    camera: [[0, 48, 56.5, 1.18], [7, 48, 52, 1.19], [15, 50, 49.8, 1.24], [22, 49, 51, 1.21]],
    guest: [[0, -6, .56], [6, -7, .65], [14, -10, .9], [22, -10, .9]],
    captions: [
      [0, "案上的茶还冒着热气，门帘外传来车轮和脚步声。"],
      [8, "一位在街边走了许久的客人，在铺前慢下脚步。"],
      [16, "你从柜台后望过去，客人抬起头，街上的交谈声仍在继续。"]
    ]
  }
};

const $ = (id) => document.getElementById(id);
const viewport = $("viewport");
const world = $("world");
const image = $("scroll-image");
const range = $("map-range");
const scene = $("scene");
const evidence = $("evidence");
const soundToggle = $("sound-toggle");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const sound = new Audio();
const visited = new Set();
let playing = null;
let worldRatio = 21.333;
let initialized = false;
let soundEnabled = true;
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
  enter.addEventListener("click", () => openScene(role));
  const details = document.createElement("button");
  details.className = "evidence-button";
  details.type = "button";
  details.hidden = true;
  details.textContent = "原画依据";
  details.setAttribute("aria-label", `查看${role.name}的原画依据`);
  details.addEventListener("click", () => showEvidence(role));
  role.details = details;
  hotspot.append(enter, details);
  $("hotspots").append(hotspot);

  const card = document.createElement("button");
  card.className = "person";
  card.type = "button";
  card.innerHTML = `<span>${role.name}</span><small>${role.location} · ${role.label}</small><span class="arrow" aria-hidden="true">↗</span>`;
  card.addEventListener("click", () => {
    goTo(role, "instant");
    openScene(role);
  });
  $("people-list").append(card);
}

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => goTo(roles.find((role) => role.id === button.dataset.go)));
});

const limit = () => Math.max(0, viewport.scrollWidth - viewport.clientWidth);

function goTo(role, behavior = reduceMotion.matches ? "instant" : "smooth") {
  const position = world.clientWidth * role.x / 100 - viewport.clientWidth / 2;
  viewport.scrollTo({ left: position, behavior });
  if (behavior === "instant") updateViewport();
}

function updateViewport() {
  scrollFrame = 0;
  const width = viewport.scrollWidth;
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
  document.querySelectorAll("[data-go]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.go === active.id));
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
  paintMotion();
}

function paintMotion() {
  const motions = $("motions");
  const waterAreas = [
    { x: 95.6, y: 76, width: 1.9, height: 16 },
    { x: 65.6, y: 61, width: 4.0, height: 35 },
    { x: 50.1, y: 45, width: 2.4, height: 8 }
  ];
  for (const area of waterAreas) {
    const layer = document.createElement("div");
    layer.className = "water";
    Object.assign(layer.style, {
      left: `${area.x}%`, top: `${area.y}%`, width: `${area.width}%`, height: `${area.height}%`
    });
    motions.append(layer);
  }
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
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
let lookDrag = null;

function openScene(role) {
  if (playing || scene.open || evidence.open) return;
  const route = journeys[role.id];
  playing = {
    role, route, left: viewport.scrollLeft, elapsed: 0, lastTime: 0, frame: 0,
    lookX: 0, lookY: 0, paused: false, caption: "",
  };
  stage.dataset.role = role.id;
  sceneLook.tabIndex = reduceMotion.matches ? -1 : 0;
  const art = role.id === "boatman" ? "boat-deck" : role.id;
  $("scene-art").style.backgroundImage = `url("./assets/${art}.webp")`;
  $("scene-title").textContent = role.name;
  $("scene-location").textContent = role.location + " · 第一人称";
  $("scene-hint").textContent = reduceMotion.matches ? "" : "拖动画面可环顾";
  scene.showModal();
  document.body.classList.add("modal-open");
  measureScene();
  updateSceneControls();
  sound.src = `./assets/${role.id}.wav`;
  sound.muted = !soundEnabled;
  sound.volume = 0;
  sound.loop = true;
  resumeJourney();
}

function sample(track, elapsed, eased = false) {
  const end = track.findIndex(([second]) => second > elapsed);
  if (end < 0) return track.at(-1).slice(1);
  const [from, ...start] = track[end - 1];
  const [to, ...finish] = track[end];
  const ratio = (elapsed - from) / (to - from);
  const mix = eased ? ratio * ratio * (3 - 2 * ratio) : ratio;
  return start.map((value, i) => value + (finish[i] - value) * mix);
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
  const [x, y, scale] = sample(route.camera, motionTime);
  const marginX = Math.max(0, (artWidth * scale - width) / 2 - 2);
  const marginY = Math.max(0, (artHeight * scale - height) / 2 - 2);
  const step = run.role.id === "traveler" && motionTime
    ? Math.sin(motionTime * 8.7) * .003 * height * Math.min(1, motionTime, (route.duration - motionTime) / 2)
    : 0;
  const cameraX = (50 - x) * artWidth * scale / 100 + width * run.lookX / 100;
  const cameraY = (50 - y) * artHeight * scale / 100 + height * run.lookY / 100 + step;
  stage.style.setProperty("--move-x", `${clamp(cameraX, -marginX, marginX).toFixed(2)}px`);
  stage.style.setProperty("--move-y", `${clamp(cameraY, -marginY, marginY).toFixed(2)}px`);
  stage.style.setProperty("--zoom", scale.toFixed(4));
  if (route.mast) stage.style.setProperty("--mast-angle", `${sample(route.mast, motionTime, true)[0]}deg`);
  if (route.guest) {
    const [shift, distance] = sample(route.guest, motionTime, true);
    stage.style.setProperty("--guest-x", `${shift}%`);
    stage.style.setProperty("--guest-scale", distance.toFixed(4));
  }
  const caption = route.captions.findLast(([time]) => time <= elapsed)[1];
  if (caption !== run.caption) {
    run.caption = caption;
    $("scene-caption").textContent = caption;
  }
}

function updateSceneControls() {
  const { paused, elapsed, route } = playing;
  const ended = elapsed >= route.duration;
  stage.dataset.paused = String(paused || ended);
  pauseButton.textContent = ended ? "再走一遍" : paused ? "继续前行" : "停留片刻";
}

function advanceJourney(now) {
  const run = playing;
  if (!run || run.paused || !scene.open) return;
  const delta = run.lastTime ? Math.min(now - run.lastTime, 100) / 1000 : 0;
  run.lastTime = now;
  run.elapsed = Math.min(run.elapsed + delta, run.route.duration);
  drawJourney(run);
  const fade = clamp(Math.min(run.elapsed / .8, (run.route.duration - run.elapsed) / 3), 0, 1);
  sound.volume = run.route.volume * fade;
  if (run.elapsed >= run.route.duration) {
    sound.pause();
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
  sound.play().catch(() => {});
  playing.frame = requestAnimationFrame(advanceJourney);
}

function toggleJourney() {
  if (!playing || !scene.open) return;
  const run = playing;
  if (run.elapsed >= run.route.duration) {
    run.elapsed = run.lookX = run.lookY = 0;
    sound.currentTime = 0;
    sound.volume = 0;
    drawJourney(run);
    resumeJourney();
  } else if (run.paused) {
    resumeJourney();
  } else {
    run.paused = true;
    cancelAnimationFrame(run.frame);
    sound.pause();
    updateSceneControls();
  }
}

pauseButton.addEventListener("click", toggleJourney);
sceneLook.addEventListener("pointerdown", (event) => {
  if (!playing || lookDrag || event.button !== 0 || reduceMotion.matches) return;
  lookDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: playing.lookX, startY: playing.lookY };
  sceneLook.setPointerCapture(event.pointerId);
  sceneLook.classList.add("looking");
});
sceneLook.addEventListener("pointermove", (event) => {
  if (!playing || lookDrag?.id !== event.pointerId) return;
  playing.lookX = clamp(lookDrag.startX + (event.clientX - lookDrag.x) * 100 / playing.width, -9, 9);
  playing.lookY = clamp(lookDrag.startY + (event.clientY - lookDrag.y) * 100 / playing.height, -8, 8);
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
    case "ArrowLeft": playing.lookX = clamp(playing.lookX + 2, -9, 9); break;
    case "ArrowRight": playing.lookX = clamp(playing.lookX - 2, -9, 9); break;
    case "ArrowUp": playing.lookY = clamp(playing.lookY + 2, -8, 8); break;
    case "ArrowDown": playing.lookY = clamp(playing.lookY - 2, -8, 8); break;
    default: return;
  }
  event.preventDefault();
  drawJourney(playing);
});

new ResizeObserver(measureScene).observe(stage);
$("scene-back").addEventListener("click", () => scene.close());
scene.addEventListener("close", () => {
  if (!playing) return;
  const { role, frame, left } = playing;
  cancelAnimationFrame(frame);
  lookDrag = null;
  sceneLook.classList.remove("looking");
  sound.pause();
  sound.removeAttribute("src");
  sound.load();
  playing = null;
  document.body.classList.remove("modal-open");
  viewport.scrollLeft = left;
  if (!visited.has(role.id)) {
    visited.add(role.id);
    role.details.hidden = false;
  }
  updateViewport();
});

function showEvidence(role) {
  if (scene.open || evidence.open) return;
  $("evidence-title").textContent = `${role.name} · 原画依据`;
  $("evidence-fact").textContent = role.fact;
  $("evidence-scene").textContent = role.staging;
  evidence.showModal();
  document.body.classList.add("modal-open");
  const crop = $("evidence-crop");
  const cropImage = crop.querySelector("img");
  const cropWidth = crop.clientHeight * worldRatio;
  cropImage.style.width = `${cropWidth}px`;
  cropImage.style.left = `${crop.clientWidth / 2 - cropWidth * role.x / 100}px`;
  crop.querySelector(".evidence-pin").style.top = `${role.y}%`;
}

evidence.addEventListener("close", () => document.body.classList.remove("modal-open"));
soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  sound.muted = !soundEnabled;
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  soundToggle.textContent = soundEnabled ? "声音开启" : "声音关闭";
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
