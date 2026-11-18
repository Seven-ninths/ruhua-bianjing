(() => {
  "use strict";

  const art = new Image();
  art.src = "./assets/boatman.webp";

  const width = 1672;
  const height = 941;
  const crop = { x: 378, y: 270, width: 654, height: 550 };
  const pivot = [978, 650];
  const knot = [642, 415];
  const restingGrip = [724, 570];
  // Outline traced on the isolated shaft in its own along-grain coordinates.
  // The tip starts just inside the exposed wood where the bridge originally occluded it.
  const shaftTop = [
    [16, -12], [18, -18], [22, -22.8], [34, -24.3], [48, -26], [61, -27.8],
    [82, -28.8], [104, -30.3], [130, -32.3], [135, -34.9], [140, -37], [147, -38],
    [152, -37.6], [160, -37.3], [169, -35.5], [180, -33.5], [199, -34.5], [225, -33.8],
    [250, -35.5], [269, -35.4], [293, -33.7], [315, -33.2], [337, -32], [358, -30.8],
    [380, -28.8], [399, -25.2], [415, -26.5], [433, -24.8], [445, -24.1], [451, -27],
    [460, -31], [468, -31.8], [475, -29.3], [481, -26.8], [492, -22.7], [508, -18.8],
    [525, -16.5], [537, -16], [544, -17.2], [554, -16], [563, -13], [565, -9],
    [560, -3], [556, 4], [552, 12], [551, 18], [555, 28], [563, 39],
    [568, 47]
  ];
  const shaftBottom = [
    [16, -12], [16, -6], [18, -1.5], [23, 0.3], [43, -0.5], [70, -1.5],
    [99, -2], [117, -3], [128, -3.4], [134, -1.4], [141, 1.1], [147, 1.1],
    [153, -0.5], [160, 1], [165, 3.5], [170, 5.7], [174, 5.2], [179, -1.2],
    [198, -2.2], [215, -1], [235, 0], [252, 0.4], [274, 2.6], [297, 4.7],
    [315, 6.2], [338, 8.8], [357, 11], [377, 14], [388, 16.8], [407, 19.1],
    [428, 21.5], [444, 22.5], [448, 27.7], [455, 31.4], [464, 34.5], [471, 36.8],
    [477, 37], [483, 34.8], [492, 34.5], [503, 39.8], [520, 43.9], [536, 47.3],
    [552, 50.8], [563, 49.6], [568, 47]
  ];
  const grainAngle = 34.7 * Math.PI / 180;
  const grainX = Math.cos(grainAngle);
  const grainY = Math.sin(grainAngle);
  const mast = new Path2D();
  for (const [index, [along, across]] of [...shaftTop, ...shaftBottom.slice(1, -1).reverse()].entries()) {
    const x = 508 + along * grainX - across * grainY;
    const y = 324 + along * grainY + across * grainX;
    if (index === 0) mast.moveTo(x, y);
    else mast.lineTo(x, y);
  }
  mast.closePath();
  const overlays = new WeakMap();

  function mount(world) {
    const canvas = document.createElement("canvas");
    canvas.width = crop.width;
    canvas.height = crop.height;
    canvas.dataset.sceneEffect = "boatman";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "absolute",
      left: crop.x / width * 100 + "%",
      top: crop.y / height * 100 + "%",
      width: crop.width / width * 100 + "%",
      height: crop.height / height * 100 + "%",
      pointerEvents: "none"
    });
    world.append(canvas);
    return { context: canvas.getContext("2d"), angle: NaN, handX: NaN, handY: NaN };
  }

  window.drawBoatRig = (world, angle, [handX, handY] = restingGrip) => {
    if (!art.complete || art.naturalWidth !== width || art.naturalHeight !== height) return;
    let overlay = overlays.get(world);
    if (!overlay) {
      overlay = mount(world);
      overlays.set(world, overlay);
    }
    if (angle === overlay.angle && handX === overlay.handX && handY === overlay.handY) return;
    Object.assign(overlay, { angle, handX, handY });

    const { context } = overlay;
    const radians = angle * Math.PI / 180;
    const [dx, dy] = [knot[0] - pivot[0], knot[1] - pivot[1]];
    const knotX = pivot[0] + dx * Math.cos(radians) - dy * Math.sin(radians);
    const knotY = pivot[1] + dx * Math.sin(radians) + dy * Math.cos(radians);

    context.clearRect(0, 0, crop.width, crop.height);
    context.save();
    context.translate(-crop.x, -crop.y);
    context.beginPath();
    context.moveTo(knotX, knotY);
    context.quadraticCurveTo(knotX + 20, (knotY + handY) / 2, handX, handY);
    context.bezierCurveTo(handX + 35, handY + 69, 768, 752, 832, 792);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#4b3927d9";
    context.lineWidth = 3.3;
    context.stroke();
    context.strokeStyle = "#bf9b6dc9";
    context.lineWidth = 1.3;
    context.stroke();

    context.translate(...pivot);
    context.rotate(radians);
    context.translate(-pivot[0], -pivot[1]);
    context.clip(mast);
    context.drawImage(art, 0, 0);
    context.restore();
  };
})();
