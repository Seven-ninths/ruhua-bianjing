(() => {
  "use strict";

  const art = new Image();
  art.src = "./assets/boat-deck.webp";

  const paintingWidth = 1672;
  const paintingHeight = 941;
  const crop = { x: 491, y: 426, width: 301, height: 245 };
  const columns = 10;
  const rows = 9;
  const overlays = new WeakMap();
  const worker = new Path2D(
    "M541 622L552 603 551 587Q555 560 578 536Q591 522 609 514 " +
    "L614 503Q605 498 604 489Q602 477 613 470Q624 464 635 474 " +
    "Q652 474 660 490L661 503 654 508 651 521 649 526 " +
    "Q666 537 677 556L686 564 707 560Q718 553 727 558L734 566 " +
    "Q736 572 730 578L700 586 680 594 667 596 658 586 " +
    "Q647 603 632 614L623 636 542 649Z"
  );

  const gestures = [
    [0, 0, 0], [3.6, .12, .02], [5.9, .21, .11],
    [7.35, .49, .37], [8.3, .51, .48], [9.1, .42, .44],
    [10.8, .67, .72], [12.4, .78, .84], [14.1, .94, 1],
    [15.2, .72, .95], [17.8, .34, .68], [23, .23, .56]
  ];

  function ease(value) {
    const fraction = Math.max(0, Math.min(1, value));
    return fraction * fraction * (3 - 2 * fraction);
  }

  function feather(value, start, end, edge) {
    return ease((value - start) / edge) * ease((end - value) / edge);
  }

  function poseAt(elapsed) {
    const next = gestures.findIndex(([at]) => elapsed < at);
    if (next === -1) return gestures[gestures.length - 1].slice(1);
    const [from, firstLean, firstReach] = gestures[next - 1];
    const [to, lastLean, lastReach] = gestures[next];
    const fraction = ease((elapsed - from) / (to - from));
    return [
      firstLean + (lastLean - firstLean) * fraction,
      firstReach + (lastReach - firstReach) * fraction
    ];
  }

  function displacement(artX, artY) {
    const shoulders = feather(artX, 521, 693, 38) * feather(artY, 495, 643, 41);
    const head = feather(artX, 576, 687, 22) * feather(artY, 442, 554, 31);
    const handHeight = ease((artY - 528) / 31) * ease((652 - artY) / 64);
    const hand = feather(artX, 625, 768, 28) * handHeight * ease((artX - 628) / 104);
    return {
      leanX: shoulders * 7 + head * 8,
      leanY: shoulders * 6 + head * 5,
      reachX: hand * 8,
      reachY: hand * 18
    };
  }

  const grip = [724, 570];
  const gripMotion = displacement(...grip);

  function makeMesh() {
    return Array.from({ length: rows + 1 }, (_, row) => Array.from({ length: columns + 1 }, (_, column) => {
      const x = crop.width * column / columns;
      const y = crop.height * row / rows;
      return {
        x, y,
        ...displacement(crop.x + x, crop.y + y),
        drawX: x,
        drawY: y
      };
    }));
  }

  function mountOverlay(world) {
    const canvas = document.createElement("canvas");
    canvas.className = "boat-person-overlay";
    canvas.width = crop.width;
    canvas.height = crop.height;
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "absolute",
      left: crop.x / paintingWidth * 100 + "%",
      top: crop.y / paintingHeight * 100 + "%",
      width: crop.width / paintingWidth * 100 + "%",
      height: crop.height / paintingHeight * 100 + "%",
      pointerEvents: "none"
    });
    world.querySelector(".boat-deck-layer").after(canvas);

    const texture = document.createElement("canvas");
    texture.width = crop.width;
    texture.height = crop.height;
    const textureContext = texture.getContext("2d");
    textureContext.translate(-crop.x, -crop.y);
    textureContext.clip(worker);
    textureContext.drawImage(art, 0, 0);
    return { canvas, texture, context: canvas.getContext("2d"), mesh: makeMesh(), rendered: -1 };
  }

  function drawTriangle(context, texture, origin, across, down) {
    const sx = across.x - origin.x;
    const sy = down.y - origin.y;
    const a = (across.drawX - origin.drawX) / sx;
    const b = (across.drawY - origin.drawY) / sx;
    const c = (down.drawX - origin.drawX) / sy;
    const d = (down.drawY - origin.drawY) / sy;
    const e = origin.drawX - a * origin.x - c * origin.y;
    const f = origin.drawY - b * origin.x - d * origin.y;
    const middleX = (origin.drawX + across.drawX + down.drawX) / 3;
    const middleY = (origin.drawY + across.drawY + down.drawY) / 3;

    context.save();
    context.beginPath();
    // Let adjacent triangles overlap by about one pixel so their antialiasing never opens a seam.
    for (const [index, point] of [origin, across, down].entries()) {
      const x = middleX + (point.drawX - middleX) * 1.1;
      const y = middleY + (point.drawY - middleY) * 1.1;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.clip();
    context.setTransform(a, b, c, d, e, f);
    const left = Math.max(0, Math.min(origin.x, across.x) - 2);
    const top = Math.max(0, Math.min(origin.y, down.y) - 2);
    const right = Math.min(crop.width, Math.max(origin.x, across.x) + 2);
    const bottom = Math.min(crop.height, Math.max(origin.y, down.y) + 2);
    context.drawImage(texture, left, top, right - left, bottom - top, left, top, right - left, bottom - top);
    context.restore();
  }

  window.drawBoatPeople = (world, elapsed) => {
    if (!world || !Number.isFinite(elapsed)) return;
    let overlay = overlays.get(world);

    if (world.parentElement?.closest(".scene-stage")?.dataset.role !== "boatman") return grip;
    if (!overlay) {
      if (!art.complete || art.naturalWidth !== paintingWidth || art.naturalHeight !== paintingHeight) return grip;
      overlay = mountOverlay(world);
      overlays.set(world, overlay);
    }

    const frame = Math.floor(elapsed * 36);
    if (overlay.rendered === frame) return overlay.grip;
    overlay.rendered = frame;
    overlay.canvas.hidden = false;
    const { context, texture, mesh } = overlay;
    const [lean, reach] = poseAt(elapsed);
    overlay.grip = [
      grip[0] + lean * gripMotion.leanX + reach * gripMotion.reachX,
      grip[1] + lean * gripMotion.leanY + reach * gripMotion.reachY
    ];
    for (const row of mesh) {
      for (const point of row) {
        point.drawX = point.x + lean * point.leanX + reach * point.reachX;
        point.drawY = point.y + lean * point.leanY + reach * point.reachY;
      }
    }

    context.clearRect(0, 0, crop.width, crop.height);
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const upperLeft = mesh[row][column];
        const upperRight = mesh[row][column + 1];
        const lowerLeft = mesh[row + 1][column];
        const lowerRight = mesh[row + 1][column + 1];
        drawTriangle(context, texture, upperLeft, upperRight, lowerLeft);
        drawTriangle(context, texture, lowerRight, lowerLeft, upperRight);
      }
    }
    return overlay.grip;
  };
})();
