"use strict";

const roles = [
  {
    id: "traveler", location: "城郊", name: "赶路人",
    x: 79.79, y: 82.5, label: "沿汴河往城里走",
    pins: ["沿着土路往前，近处传来脚步和水声。", "抬起视线，前方陆续出现赶路的人。", "脚下的路与沿河的屋舍一同向前延伸。"],
    fact: "画卷前段表现汴京城郊。道路穿过田野与低矮屋舍，路上可见往来的人物。",
    staging: "这里借一位赶路人的视角重组原画空间。沿河的步行路线、镜头和脚步声属于情景演绎。",
    camera: ["scale(1.21) translate(2%, -4%)", "scale(1.25) translate(.2%, 2.5%)", "scale(1.30) translate(-3.5%, 4%)"],
    near: ["scale(1.30) translate(4%, -5%)", "scale(1.32) translate(0, 3%)", "scale(1.39) translate(-6%, 5%)"]
  },
  {
    id: "boatman", location: "虹桥", name: "船工",
    x: 51.62, y: 30.5, label: "随漕船靠近桥孔",
    pins: ["抬头看看桥孔。木梁正在眼前一点点变近。", "目光落回甲板，同伴正把桅杆放低。", "水拍着船身，桥上的声音从头顶传来。"],
    fact: "桥下的漕船正放倒桅杆，准备穿过桥孔。船工忙着操作，桥上有人驻足观看。",
    staging: "镜头以船工的视高看桥孔和同伴。过桥时的具体节奏、船身晃动和环境声根据原画细节重新构思。",
    camera: ["scale(1.16) translate(0, 6%)", "scale(1.26) translate(-2%, -5.5%)", "scale(1.34) translate(-4%, -1%)"],
    near: ["scale(1.24) translate(0, 8%)", "scale(1.33) translate(-3%, -6%)", "scale(1.41) translate(-6%, -2%)"]
  },
  {
    id: "shopkeeper", location: "街市", name: "店伙计",
    x: 15.83, y: 43, label: "从铺子里望向街面",
    pins: ["从柜台后抬头，店门外就是往来不断的街道。", "有人在铺门前停下来，柜台边响起一声轻碰。", "向门口迎几步，叫卖和脚步的声音更近了。"],
    fact: "长卷后段描绘临街商铺与穿行其间的人物。沿街店面与道路直接相连。",
    staging: "店伙计、停在门口的客人和迎客的动作是场景设定。柜台位置和环境声按第一人称体验设计。",
    camera: ["scale(1.13) translate(1.5%, -3.5%)", "scale(1.21) translate(-1%, 1%)", "scale(1.34) translate(-4%, 1%)"],
    near: ["scale(1.19) translate(2%, -4%)", "scale(1.29) translate(-2%, 2%)", "scale(1.43) translate(-6%, 2%)"]
  }
];

const $ = (id) => document.getElementById(id);
const viewport = $("viewport");
const world = $("world");
const image = $("scroll-image");
const range = $("map-range");
const scene = $("scene");
const evidence = $("evidence");
const soundToggle = $("sound-toggle");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const duration = 15000;
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

function openScene(role) {
  if (playing || scene.open || evidence.open) return;
  const artwork = `url("./assets/${role.id}.webp")`;
  const base = $("scene-art");
  const near = $("scene-near");
  base.style.backgroundImage = artwork;
  near.style.backgroundImage = artwork;
  $("scene-title").textContent = role.name;
  $("scene-location").textContent = role.location + " · 第一人称";
  $("scene-progress").value = 0;
  $("scene-time").textContent = "0:00 / 0:15";
  $("scene-caption").textContent = role.pins[0];
  $("scene-pause").textContent = "暂停";
  scene.showModal();
  document.body.classList.add("modal-open");
  const animations = reduceMotion.matches ? [] : [[base, role.camera], [near, role.near]].map(([layer, keyframes]) => layer.animate(
    keyframes.map((transform, index) => ({ transform, offset: [0, .51, 1][index], easing: "ease-in-out" })),
    { duration, fill: "forwards" }
  ));
  playing = { role, animations, start: performance.now(), elapsed: 0, paused: false, frame: 0, left: viewport.scrollLeft };
  sound.src = `./assets/${role.id}.wav`;
  sound.muted = !soundEnabled;
  sound.volume = .77;
  sound.play().catch(() => {});
  playing.frame = requestAnimationFrame(tick);
}

function tick(now) {
  if (!playing || playing.paused || !scene.open) return;
  const elapsed = Math.min(duration, Math.max(0, now - playing.start));
  $("scene-progress").value = elapsed / 1000;
  $("scene-time").textContent = `0:${String(Math.floor(elapsed / 1000)).padStart(2, "0")} / 0:15`;
  const caption = playing.role.pins[Math.min(2, Math.floor(elapsed / 5000))];
  if ($("scene-caption").textContent !== caption) $("scene-caption").textContent = caption;
  if (elapsed >= duration) {
    scene.close();
  } else {
    playing.frame = requestAnimationFrame(tick);
  }
}

$("scene-back").addEventListener("click", () => scene.close());
$("scene-pause").addEventListener("click", () => {
  if (!playing || !scene.open) return;
  if (playing.paused) {
    playing.start = performance.now() - playing.elapsed;
    playing.paused = false;
    playing.animations.forEach((animation) => animation.play());
    sound.play().catch(() => {});
    playing.frame = requestAnimationFrame(tick);
    $("scene-pause").textContent = "暂停";
  } else {
    playing.elapsed = performance.now() - playing.start;
    playing.paused = true;
    playing.animations.forEach((animation) => animation.pause());
    sound.pause();
    cancelAnimationFrame(playing.frame);
    $("scene-pause").textContent = "继续";
  }
});
scene.addEventListener("close", () => {
  if (!playing) return;
  const { role, frame, animations, left } = playing;
  cancelAnimationFrame(frame);
  animations.forEach((animation) => animation.cancel());
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
  preloader.src = `./assets/${role.id}.webp`;
}
