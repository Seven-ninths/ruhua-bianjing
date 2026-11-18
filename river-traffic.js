(() => {
  "use strict";

  const reference = new Image();
  reference.src = "./assets/boat-deck.webp";

  const image = { width: 1672, height: 941 };
  const crop = { x: 967, y: 529, width: 150, height: 60 };
  const bounds = { x: 875, y: 502, width: 473, height: 153 };
  const waterline = { x: 1039, y: 574 };
  const overlays = new WeakMap();

  const hull = [
    [976, 566], [974, 563], [977, 561], [981, 566], [986, 565], [989, 557],
    [990, 549], [996, 545], [1013, 540], [1027, 539], [1043, 539], [1053, 537],
    [1064, 535], [1074, 536], [1080, 540], [1078, 543], [1074, 544], [1075, 554],
    [1084, 556], [1088, 557], [1094, 556], [1097, 559], [1097, 566], [1105, 566],
    [1106, 568], [1103, 571], [1105, 574], [1102, 577], [1095, 579], [1081, 579],
    [1060, 578], [1038, 578], [1017, 576], [997, 574], [984, 572]
  ];

  function bitmap(width, height) {
    const surface = document.createElement("canvas");
    surface.width = width;
    surface.height = height;
    return surface;
  }

  function traceHull(context) {
    context.beginPath();
    hull.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x - crop.x, y - crop.y);
      else context.lineTo(x - crop.x, y - crop.y);
    });
    context.closePath();
  }

  function makeBoat() {
    const sprite = bitmap(crop.width, crop.height);
    const context = sprite.getContext("2d");
    traceHull(context);
    context.clip();
    context.drawImage(reference, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    return sprite;
  }

  function makeClearWater() {
    const landAndWater = bitmap(crop.width, crop.height);
    const landContext = landAndWater.getContext("2d");
    // Borrow the same distant shoreline and river colors once to fill underneath the original stationary craft.
    landContext.drawImage(reference, 1099, 529, crop.width, 48, 0, 0, crop.width, 48);

    const water = bitmap(crop.width, crop.height);
    const waterContext = water.getContext("2d");
    const blend = waterContext.createLinearGradient(0, 26, 0, 43);
    blend.addColorStop(0, "transparent");
    blend.addColorStop(1, "#fff");
    waterContext.drawImage(reference, 1102, 586, crop.width, 34, 0, 26, crop.width, 34);
    waterContext.globalCompositeOperation = "destination-in";
    waterContext.fillStyle = blend;
    waterContext.fillRect(0, 0, crop.width, crop.height);
    landContext.drawImage(water, 0, 0);

    const mask = bitmap(crop.width, crop.height);
    const maskContext = mask.getContext("2d");
    maskContext.filter = "blur(2px)";
    traceHull(maskContext);
    maskContext.fill();
    maskContext.lineWidth = 11;
    maskContext.lineJoin = "round";
    maskContext.stroke();
    landContext.globalCompositeOperation = "destination-in";
    landContext.drawImage(mask, 0, 0);
    return landAndWater;
  }

  function mount(world) {
    const canvas = bitmap(bounds.width, bounds.height);
    canvas.dataset.sceneEffect = "boatman";
    canvas.className = "river-traffic-layer";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "absolute",
      left: bounds.x / image.width * 100 + "%",
      top: bounds.y / image.height * 100 + "%",
      width: bounds.width / image.width * 100 + "%",
      height: bounds.height / image.height * 100 + "%",
      pointerEvents: "none"
    });
    const waterLayers = world.querySelectorAll(".river-texture-layer");
    const anchor = waterLayers[waterLayers.length - 1] || world.querySelector(".scene-art");
    if (anchor) anchor.after(canvas);
    else world.append(canvas);
    return { canvas, context: canvas.getContext("2d"), sprite: makeBoat(), clearWater: makeClearWater(), frame: -1 };
  }

  function wake(context, stern, waterY, elapsed, depth) {
    const reach = 55 + 19 * depth;
    const shimmer = Math.sin(elapsed * 2.1) * .72;
    const color = context.createLinearGradient(stern - reach, 0, stern + 30, 0);
    color.addColorStop(0, "rgba(230,211,176,0)");
    color.addColorStop(.61, "rgba(236,218,186,.44)");
    color.addColorStop(1, "rgba(236,218,186,0)");
    context.strokeStyle = color;
    context.lineCap = "round";

    context.lineWidth = .85;
    context.beginPath();
    context.moveTo(stern + 15, waterY + 2);
    context.bezierCurveTo(stern - 5, waterY + 6, stern - 27, waterY - 2, stern - reach, waterY + 5 + shimmer);
    context.stroke();

    context.lineWidth = .65;
    context.beginPath();
    context.moveTo(stern + 13, waterY + 5);
    context.bezierCurveTo(stern + 1, waterY + 7, stern - 25, waterY + 10, stern - reach * .81, waterY + 14 - shimmer);
    context.stroke();
  }

  function paint(overlay, elapsed) {
    const { context, sprite, clearWater } = overlay;
    const progress = Math.min(1, elapsed / 23);
    const distance = 188 * (.53 * progress + .47 * progress * (2 - progress));
    const approach = 17 * progress + 7 * progress * progress;
    const heave = Math.sin(elapsed * 1.14) * .75 * Math.min(1, elapsed);
    const scale = 1 + .14 * progress;
    const x = waterline.x + distance;
    const y = waterline.y + approach + heave;
    const near = Math.min(1, elapsed / 1.25);

    context.clearRect(0, 0, bounds.width, bounds.height);
    context.save();
    context.translate(-bounds.x, -bounds.y);
    context.drawImage(clearWater, crop.x, crop.y);

    context.save();
    context.globalAlpha = near;
    wake(context, x + (976 - waterline.x) * scale, y, elapsed, progress);
    context.restore();

    context.save();
    context.translate(x, y + 3);
    context.scale(scale, -.25 * scale);
    context.globalAlpha = .17 * near;
    context.filter = "blur(1.4px)";
    context.drawImage(sprite, crop.x - waterline.x, crop.y - waterline.y);
    context.restore();

    context.translate(x, y);
    context.rotate(Math.sin(elapsed * .98) * .0045 * near);
    context.scale(scale, scale);
    context.drawImage(sprite, crop.x - waterline.x, crop.y - waterline.y);
    context.restore();
  }

  window.drawRiverTraffic = (world, elapsed) => {
    if (!world || !Number.isFinite(elapsed)) return;
    let overlay = overlays.get(world);
    if (elapsed <= 0) {
      if (overlay) {
        overlay.canvas.hidden = true;
        overlay.frame = -1;
      }
      return;
    }
    if (!overlay) {
      if (!reference.complete || reference.naturalWidth !== image.width || reference.naturalHeight !== image.height) return;
      overlay = mount(world);
      overlays.set(world, overlay);
    }

    const frame = Math.floor(elapsed * 36);
    if (overlay.frame === frame) return;
    overlay.frame = frame;
    overlay.canvas.hidden = false;
    paint(overlay, frame / 36);
  };
})();
