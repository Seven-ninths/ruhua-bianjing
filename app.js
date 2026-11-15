"use strict";

const roles = [
  {
    id: "traveler", location: "城郊", name: "赶路人",
    x: 79.79, y: 82.5, label: "沿汴河往城里走",
    fact: "画卷前段表现汴京城郊。道路穿过田野与低矮屋舍，路上可见往来的人物。",
    staging: "沿河行走和在窄路上与驮货的牲畜相遇，是根据画里的道路、行旅与牲畜构思的情节。"
  },
  {
    id: "boatman", location: "虹桥", name: "船工",
    x: 51.62, y: 30.5, label: "随漕船靠近桥孔",
    fact: "桥下的漕船正放倒桅杆，准备穿过桥孔。船工忙着操作，桥上有人驻足观看。",
    staging: "拉绳降低桅杆是为网页设计的简化操作。放桅节奏、船身晃动与场景声响属于情景演绎。"
  },
  {
    id: "shopkeeper", location: "街市", name: "店伙计",
    x: 15.83, y: 43, label: "从铺子里望向街面",
    fact: "长卷后段描绘临街商铺与穿行其间的人物。沿街店面与道路直接相连。",
    staging: "这次迎客与递茶是基于画中街市和店铺设计的情节。店伙计、客人和他们的动作属于情景演绎。"
  }
];

const stories = {
  traveler: {
    opening: { caption: "土路沿着汴河伸向城里。前面的拐弯处传来蹄声。", actions: [
      { label: "沿土路往前走", next: "encounter", motion: 800 }
    ] },
    encounter: { caption: "驮着货的驴迎面过来，路在这里收窄了。你准备在哪里让它先过？", actions: [
      { label: "侧身让到河边", next: "riverbank", motion: 1500 },
      { label: "退到篱笆旁", next: "fence", motion: 1500 }
    ] },
    riverbank: { caption: "你站到河边，驮货的驴从身后过去。船桨划开近处的水，路重新空了出来。", actions: [
      { label: "继续往城里走", next: "arrived", motion: 800 }
    ] },
    fence: { caption: "你贴着篱笆等了一会儿。驮货的驴擦着路沿过去，蹄声渐渐远了。", actions: [
      { label: "继续往城里走", next: "arrived", motion: 800 }
    ] },
    arrived: { caption: "绕过弯道，沿河的屋舍逐渐密起来。你继续朝城里走。" }
  },
  boatman: {
    opening: { caption: "漕船快到虹桥了。船头朝着桥孔，你得先看一眼上方的余量。", actions: [
      { label: "抬头看看桥孔", next: "check", motion: 630 }
    ] },
    check: { caption: "桅杆还太高，得在它碰到木梁前放低。同伴已经在等你的示意。", actions: [
      { label: "低头握住放桅绳", next: "lower", motion: 500 }
    ] },
    lower: { caption: "向下拖动绳结，分三次松放。也可以点下方按钮，观察桅杆每次降到哪里。", actions: [
      { label: "放一截绳", pull: true, motion: 650 }
    ], object: "放桅绳" },
    clear: { caption: "桅杆已经低过桥梁。绳索在手里绷住，现在可以让船继续向前。", actions: [
      { label: "稳住桅杆，撑船过桥", next: "passed", motion: 1200 }
    ] },
    passed: { caption: "木梁从头顶掠过，河面重新亮起来。漕船平稳过桥。" }
  },
  shopkeeper: {
    opening: { caption: "你站在铺子的柜台后。门口有一位客人放慢脚步，正往里看。", actions: [
      { label: "招呼客人进来", next: "greet", motion: 850 }
    ] },
    greet: { caption: "客人走到柜台前，想喝口茶。茶碗在你手边。", actions: [
      { label: "端起茶碗", next: "holding", motion: 670 }
    ], object: "茶碗" },
    holding: { caption: "客人伸出双手。把茶碗朝客人拖过去，或点下方按钮递茶。", actions: [
      { label: "把茶递给客人", next: "served", motion: 850 }
    ], object: "拖碗递茶" },
    served: { caption: "客人接住茶碗，收回双手。门外的车轮和脚步声还在继续。" }
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
const actionList = $("scene-actions");
const objectButton = $("scene-object-button");
const teaBowl = $("tea-bowl");
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
let lookDrag = null;
let objectDrag = null;
let objectWasDragged = false;

function openScene(role) {
  if (playing || scene.open || evidence.open) return;
  playing = { role, phase: "opening", pulls: 0, timer: 0, left: viewport.scrollLeft, lookX: 0, lookY: 0 };
  stage.dataset.role = role.id;
  sceneLook.tabIndex = reduceMotion.matches ? -1 : 0;
  const art = role.id === "boatman" ? "boat-deck" : role.id;
  $("scene-art").style.backgroundImage = `url("./assets/${art}.webp")`;
  $("scene-title").textContent = role.name;
  $("scene-location").textContent = role.location + (reduceMotion.matches ? " · 第一人称" : " · 拖动画面可环顾");
  paintStory();
  showChoices();
  scene.showModal();
  document.body.classList.add("modal-open");
  sound.src = `./assets/${role.id}.wav`;
  sound.muted = !soundEnabled;
  sound.volume = .62;
  sound.loop = true;
  sound.play().catch(() => {});
}

function currentBeat() {
  return stories[playing.role.id][playing.phase];
}

function moveView() {
  stage.style.setProperty("--look-x", `${playing.lookX}cqw`);
  stage.style.setProperty("--look-y", `${playing.lookY}cqh`);
}

function paintStory() {
  stage.dataset.phase = playing.phase;
  stage.style.setProperty("--mast-angle", `${-130 - playing.pulls * 11}deg`);
  moveView();
}

function showChoices(restoreFocus = false) {
  const beat = currentBeat();
  const steps = playing.phase === "lower" ? ` 已放 ${playing.pulls}/3。` : "";
  $("scene-caption").textContent = beat.caption + steps;
  actionList.replaceChildren();
  for (const { label, ...choice } of beat.actions ?? []) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label + (choice.pull ? ` · ${playing.pulls}/3` : "");
    button.addEventListener("click", () => takeAction(choice, true));
    actionList.append(button);
  }
  if (!beat.actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "返回长卷";
    button.addEventListener("click", () => scene.close());
    actionList.append(button);
  }
  $("scene-object").hidden = !beat.object;
  objectButton.disabled = false;
  objectButton.textContent = beat.object ?? "";
  objectButton.setAttribute("aria-label", beat.object ?? "");
  if (restoreFocus) actionList.firstElementChild.focus({ preventScroll: true });
}

function takeAction(choice, fromControls = false) {
  if (!playing || playing.timer || !scene.open) return;
  const run = playing;
  if (choice.pull) {
    run.pulls++;
    run.phase = run.pulls === 3 ? "clear" : "lower";
    objectButton.animate([{ translate: "0 0" }, { translate: "0 16px" }, { translate: "0 0" }], {
      duration: reduceMotion.matches ? 1 : 480, easing: "ease-out"
    });
  } else {
    run.phase = choice.next;
  }
  run.lookX = 0;
  run.lookY = 0;
  paintStory();
  for (const button of actionList.children) button.disabled = true;
  objectButton.disabled = true;
  if (run.phase !== "lower" && !currentBeat().object) $("scene-object").hidden = true;
  run.timer = setTimeout(() => {
    run.timer = 0;
    if (playing === run && scene.open) showChoices(fromControls);
  }, reduceMotion.matches ? 0 : choice.motion);
}

objectButton.addEventListener("click", (event) => {
  if (!playing || (event.detail > 0 && objectWasDragged)) return;
  const choice = currentBeat().actions?.[0];
  if (choice) takeAction(choice, event.detail === 0);
});
objectButton.addEventListener("pointerdown", (event) => {
  if (!playing || playing.timer || !event.isPrimary || event.button !== 0) return;
  objectWasDragged = false;
  if (playing.phase !== "lower" && playing.phase !== "holding") return;
  objectDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, phase: playing.phase };
  stage.classList.add("handling");
  objectButton.setPointerCapture(event.pointerId);
});
objectButton.addEventListener("pointermove", (event) => {
  if (objectDrag?.id !== event.pointerId || !playing || playing.phase !== objectDrag.phase) return;
  const x = event.clientX - objectDrag.x;
  const y = event.clientY - objectDrag.y;
  objectWasDragged ||= Math.hypot(x, y) > 8;
  if (playing.phase === "lower") {
    const slack = clamp(y, 0, 42);
    objectButton.style.translate = `0 ${slack}px`;
    stage.style.setProperty("--mast-angle", `${-130 - playing.pulls * 11 - slack / 42 * 11}deg`);
  } else {
    const shiftX = clamp(x, -24, 110);
    const shiftY = clamp(y, -95, 25);
    objectButton.style.translate = `${shiftX}px ${shiftY}px`;
    teaBowl.style.translate = `${shiftX / 1.22}px ${shiftY / 1.22}px`;
  }
});
function finishObjectDrag(event) {
  if (objectDrag?.id !== event.pointerId || !playing) return;
  const x = event.clientX - objectDrag.x;
  const y = event.clientY - objectDrag.y;
  const completed = playing.phase === objectDrag.phase &&
    (playing.phase === "lower" ? y > 22 : x > 25 || y < -20);
  objectWasDragged ||= Math.hypot(x, y) > 8;
  objectDrag = null;
  stage.classList.remove("handling");
  objectButton.style.translate = "";
  teaBowl.style.translate = "";
  if (event.type === "pointerup" && completed && currentBeat().actions?.[0]) {
    takeAction(currentBeat().actions[0]);
  } else {
    paintStory();
  }
}
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  objectButton.addEventListener(type, finishObjectDrag);
}

sceneLook.addEventListener("pointerdown", (event) => {
  if (!playing || event.button !== 0 || reduceMotion.matches) return;
  lookDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: playing.lookX, startY: playing.lookY };
  sceneLook.setPointerCapture(event.pointerId);
  sceneLook.classList.add("looking");
});
sceneLook.addEventListener("pointermove", (event) => {
  if (!playing || lookDrag?.id !== event.pointerId) return;
  playing.lookX = clamp(lookDrag.startX + (event.clientX - lookDrag.x) * 100 / sceneLook.clientWidth, -8, 8);
  playing.lookY = clamp(lookDrag.startY + (event.clientY - lookDrag.y) * 100 / sceneLook.clientHeight, -7, 7);
  moveView();
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  sceneLook.addEventListener(type, (event) => {
    if (lookDrag?.id !== event.pointerId) return;
    lookDrag = null;
    sceneLook.classList.remove("looking");
  });
}
sceneLook.addEventListener("keydown", (event) => {
  if (!playing || reduceMotion.matches) return;
  switch (event.key) {
    case "ArrowLeft": playing.lookX = clamp(playing.lookX + 2, -8, 8); break;
    case "ArrowRight": playing.lookX = clamp(playing.lookX - 2, -8, 8); break;
    case "ArrowUp": playing.lookY = clamp(playing.lookY + 2, -7, 7); break;
    case "ArrowDown": playing.lookY = clamp(playing.lookY - 2, -7, 7); break;
    default: return;
  }
  event.preventDefault();
  moveView();
});

$("scene-back").addEventListener("click", () => scene.close());
scene.addEventListener("close", () => {
  if (!playing) return;
  const { role, timer, left } = playing;
  clearTimeout(timer);
  lookDrag = null;
  objectDrag = null;
  objectWasDragged = false;
  stage.classList.remove("handling");
  sceneLook.classList.remove("looking");
  objectButton.style.translate = "";
  teaBowl.style.translate = "";
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
