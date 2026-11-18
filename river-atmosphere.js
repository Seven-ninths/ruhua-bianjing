(() => {
  "use strict";

  const reference = new Image();
  reference.src = "./assets/boat-river.png";

  const imageWidth = 1672;
  const imageHeight = 941;
  const stripHeight = 11;
  const states = new WeakMap();

  // The masks follow the open river, inside the actual shorelines, pier and gunwales.
  const surfaces = [
    {
      side: -1, phase: 1.4,
      points: [[0,707],[87,699],[161,686],[181,671],[193,648],[254,628],[337,616],
        [432,610],[515,606],[516,627],[476,654],[428,665],[337,685],[237,716],[137,744],[0,794]]
    },
    {
      side: 1, phase: 3.5,
      points: [[1062,615],[1130,600],[1200,598],[1256,608],[1296,638],[1418,661],
        [1529,659],[1585,687],[1634,707],[1672,716],[1672,840],[1581,807],[1462,776],[1380,736],
        [1302,732],[1219,700],[1121,670],[1100,647],[1066,649]]
    },
    {
      side: 0.26, phase: 0.1,
      points: [[746,575],[838,572],[940,568],[966,573],[974,584],[1021,586],[1107,583],[1173,577],
        [1204,589],[1171,602],[1104,614],[1031,618],[986,605],[937,592],[878,582],[801,582],[747,584]]
    }
  ];

  function createSurface({ points, phase, side }) {
    const margin = 8;
    const left = Math.max(0, Math.min(...points.map((point) => point[0])) - margin);
    const top = Math.min(...points.map((point) => point[1])) - margin;
    const right = Math.min(imageWidth, Math.max(...points.map((point) => point[0])) + margin);
    const bottom = Math.max(...points.map((point) => point[1])) + margin;
    const width = right - left;
    const height = bottom - top;

    const canvas = document.createElement("canvas");
    canvas.dataset.sceneEffect = "boatman";
    canvas.className = "river-texture-layer";
    canvas.setAttribute("aria-hidden", "true");
    canvas.width = width;
    canvas.height = height;
    canvas.hidden = true;
    Object.assign(canvas.style, {
      position: "absolute",
      left: left / imageWidth * 100 + "%",
      top: top / imageHeight * 100 + "%",
      width: width / imageWidth * 100 + "%",
      height: height / imageHeight * 100 + "%",
      pointerEvents: "none"
    });

    const mask = document.createElement("canvas");
    mask.width = width;
    mask.height = height;
    const maskContext = mask.getContext("2d");
    maskContext.filter = "blur(4px)";
    maskContext.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) maskContext.moveTo(x - left, y - top);
      else maskContext.lineTo(x - left, y - top);
    });
    maskContext.closePath();
    maskContext.fill();

    return { canvas, mask, context: canvas.getContext("2d"), left, top, width, height, phase, side };
  }

  function hide(state) {
    if (!state) return;
    state.frame = -1;
    for (const layer of state.layers) layer.canvas.hidden = true;
  }

  function setup(world, stage) {
    const state = { frame: -1, layers: surfaces.map(createSurface) };
    const monitor = new MutationObserver(() => {
      if (stage.dataset.role !== "boatman") hide(state);
    });
    monitor.observe(stage, { attributes: true, attributeFilter: ["data-role"] });
    states.set(world, state);
    return state;
  }

  function sample(y, elapsed, phase, side, crossing, pan) {
    const depth = Math.max(0.16, (y - 551) / 270);
    const longWave = Math.sin(elapsed * 2.4 - y * .040 + phase + pan);
    const wake = Math.sin(elapsed * 3.25 - y * .067 + phase * .8);
    const lowWave = Math.sin(elapsed * 1.53 - y * .019 - phase);
    const energy = .86 + crossing * .28;
    return [
      depth * energy * (longWave * 4.7 + wake * 1.7 + lowWave * 2.6 * side),
      depth * energy * (wake * 1.16 + longWave * .43)
    ];
  }

  function render(layer, time, crossing, pan) {
    const { context, mask, left, top, width, height, phase, side } = layer;

    // Use only the existing painted river texture. Neighboring strips share source rows
    // and shear continuously across each other so the original reflections stay coherent.
    const pad = 13;
    const sourceLeft = Math.max(0, left - pad);
    const sourceWidth = Math.min(imageWidth, left + width + pad) - sourceLeft;
    context.drawImage(reference, left, top, width, height, 0, 0, width, height);
    let [upperX, upperY] = sample(top, time, phase, side, crossing, pan);

    for (let y = 0; y < height; y += stripHeight) {
      const strip = Math.min(stripHeight, height - y);
      const [lowerX, lowerY] = sample(top + y + strip, time, phase, side, crossing, pan);
      const shear = (lowerX - upperX) / strip;
      context.setTransform(1, 0, shear, 1, upperX - y * shear, 0);
      context.drawImage(reference, sourceLeft, top + y + upperY, sourceWidth, strip + lowerY - upperY,
        sourceLeft - left, y, sourceWidth, strip + .32);
      upperX = lowerX;
      upperY = lowerY;
    }

    context.resetTransform();
    context.globalCompositeOperation = "destination-in";
    context.drawImage(mask, 0, 0);
    context.globalCompositeOperation = "source-over";
  }

  window.drawRiverAtmosphere = (world, elapsed, view = {}) => {
    if (!world || !Number.isFinite(elapsed)) return;
    const stage = world.closest(".scene-stage");
    let state = states.get(world);

    if (!stage || stage.dataset.role !== "boatman" || elapsed <= 0) {
      hide(state);
      return;
    }
    if (!state) {
      if (!reference.complete || reference.naturalWidth !== imageWidth || reference.naturalHeight !== imageHeight) return;
      state = setup(world, stage);
    }

    const frame = Math.floor(elapsed * 30);
    if (state.frame === frame) return;
    state.frame = frame;
    const art = world.querySelector(".scene-art");
    const progress = Number.isFinite(view.progress) ? Math.max(0, Math.min(view.progress, 1)) : 0;
    const crossing = Math.sin(Math.PI * progress);
    const pan = (Number.isFinite(view.panX) ? view.panX : 0) * .023
      + (Number.isFinite(view.panY) ? view.panY : 0) * .014;

    for (const layer of state.layers) {
      if (layer.canvas.parentElement !== world) art.after(layer.canvas);
      render(layer, frame / 30, crossing, pan);
      layer.canvas.hidden = false;
    }
  };
})();
