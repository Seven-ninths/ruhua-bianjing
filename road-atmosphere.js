(() => {
  "use strict";

  const paintingWidth = 1672;
  const paintingHeight = 941;
  const artwork = new Image();
  artwork.src = new URL("./assets/traveler.webp", document.currentScript.src);
  const worlds = new WeakMap();

  // Bounds and masks are registered to the watercolor features in traveler.webp.
  const surfaces = [
    {
      kind: "river", x: 804, y: 499, width: 859, height: 289, row: 6, feather: 13,
      shape: `M 1103 538 Q 1355 507 1642 519 L 1648 737
        Q 1472 723 1292 748 L 1156 721 Q 1031 754 950 775 L 830 752
        L 848 708 L 976 701 L 998 666 L 1010 597 Z`,
    },
    {
      kind: "reeds", x: 948, y: 665, width: 604, height: 276, row: 6, feather: 10,
      shape: `M 973 895 Q 998 741 1099 702 Q 1185 687 1256 751
        L 1303 757 Q 1430 687 1517 681 L 1540 750 L 1517 864
        L 1526 928 L 974 936 Z`,
    },
    {
      kind: "willow", x: 219, y: 14, width: 725, height: 407, row: 7, feather: 12,
      shape: `M 481 28 L 801 29 Q 871 37 928 77
        L 916 193 L 777 278 L 756 406 L 638 407 L 566 367
        L 506 357 L 432 338 L 355 330 L 245 318 L 249 229
        L 311 141 L 382 86 Z`,
    },
    {
      kind: "walk", x: 563, y: 470, width: 82, height: 144, row: 4, feather: 4,
      gait: { tempo: 5, phase: 1.4, divide: 601, travel: 5.9, lift: 2.8 },
      shape: `M 572 475 Q 609 466 628 482 L 626 498 L 620 503
        Q 630 522 631 540 L 627 556 L 635 577 L 629 584 L 622 579
        L 623 591 L 623 605 L 585 607 L 580 595 L 581 577
        L 572 572 L 578 547 L 576 515 L 581 500 L 568 495 Z`,
    },
    {
      kind: "walk", x: 497, y: 495, width: 109, height: 133, row: 4, feather: 4,
      gait: { tempo: 5.32, phase: .5, divide: 553, travel: 4.3, lift: 2.4 },
      shape: `M 506 558 Q 511 539 521 534 Q 521 520 534 508
        Q 548 501 564 504 Q 580 509 588 531 Q 597 538 598 555
        L 593 572 L 573 577 L 573 607 L 566 614 L 562 611
        L 557 620 L 537 621 L 531 594 L 531 569 L 514 571 Z`,
    },
    {
      kind: "walk", x: 634, y: 486, width: 59, height: 96, row: 4, feather: 3,
      gait: { tempo: 4.66, phase: 3.4, divide: 658, travel: 6.7, lift: 2.3 },
      shape: `M 647 493 Q 659 487 669 498 L 667 507 L 675 514
        L 680 529 L 677 541 L 678 555 L 673 560 L 675 574
        L 648 577 L 646 567 L 645 557 L 640 551 L 641 538
        Q 638 528 644 516 L 650 506 Z`,
    },
    {
      kind: "moored", x: 741, y: 578, width: 253, height: 109, feather: 4,
      pivot: [964, 645],
      fixed: [[769, 580, 9, 97], [958, 580, 12, 107]],
      shape: `M 749 613 L 773 616 L 785 605 Q 795 589 818 585
        Q 843 586 864 592 Q 897 590 908 616 L 917 637 L 945 636
        L 969 637 L 984 631 L 990 638 L 979 651 Q 966 666 942 674
        Q 880 684 824 670 L 788 646 L 762 636 Z`,
    },
  ];

  function makeCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function mountSurface(anchor, surface) {
    const { x, y, width, height, feather, shape, fixed = [] } = surface;
    const canvas = makeCanvas(width, height);
    canvas.dataset.sceneEffect = "traveler";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "absolute",
      left: `${100 * x / paintingWidth}%`,
      top: `${100 * y / paintingHeight}%`,
      width: `${100 * width / paintingWidth}%`,
      height: `${100 * height / paintingHeight}%`,
      pointerEvents: "none",
    });
    anchor.after(canvas);

    const matte = makeCanvas(width, height);
    const mask = matte.getContext("2d");
    mask.translate(-x, -y);
    mask.filter = `blur(${feather}px)`;
    mask.fill(new Path2D(shape));
    mask.filter = "none";
    mask.resetTransform();
    for (const [left, top, span, length] of fixed) mask.clearRect(left - x, top - y, span, length);
    return { surface, canvas, context: canvas.getContext("2d"), matte };
  }

  function createWorld(world) {
    let anchor = world.querySelector(".scene-art");
    if (!anchor) return null;
    const layers = surfaces.map(surface => {
      const layer = mountSurface(anchor, surface);
      anchor = layer.canvas;
      return layer;
    });
    return { layers, seconds: -1, panX: 0, panY: 0 };
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function offset(kind, ratio, seconds, panX, panY, progress) {
    if (kind === "river") {
      // Tiny bands of the existing reflection shift by different amounts.
      const current = Math.sin(ratio * 32 - seconds * 1.8);
      const smallWave = Math.sin(ratio * 67 - seconds * 2.3);
      return [2.2 * current + .56 * smallWave + panX * .85, .75 * Math.sin(ratio * 27 - seconds * 1.1) + panY * .35];
    }
    if (kind === "willow") {
      const bend = ratio ** 1.65;
      const wind = Math.sin(seconds * 1.28 - ratio * 1.5);
      const leafFlutter = Math.sin(seconds * 2.35 + ratio * 4.2);
      return [bend * (8.1 * wind + 1.2 * leafFlutter + panX * 10), bend * (1.15 * wind + panY * 3.1)];
    }

    // The reeds are rooted into the bank, so their tips move more than their bases.
    const bend = (1 - ratio) ** 1.7;
    const wind = Math.sin(seconds * 1.61 + ratio * 3.4);
    const gust = Math.sin(seconds * .74 - ratio * 2.5);
    return [bend * (9.2 * wind + 2.8 * gust + panX * 13 + progress * 1.8),
      bend * (.95 * gust + panY * 4.1)];
  }

  function drawWalkRow(context, surface, from, span, ratio, seconds) {
    const { x, y, width, gait } = surface;
    const travel = clamp((seconds - .9) / 23.3, 0, 1);
    const forward = travel * travel * (3 - 2 * travel);
    const cycle = forward * 23.3 * gait.tempo + gait.phase;
    const settling = Math.min(1, travel * 8, (1 - travel) * 8);
    const up = Math.sin(cycle) * settling;
    const easeIn = Math.min(1, seconds / .95);
    const feet = clamp((ratio - .66) / .28, 0, 1);
    const horizontal = (forward * gait.travel + up * (1.2 + feet * .48)) * easeIn;
    const vertical = (-forward * gait.travel * .49 + (Math.cos(cycle * 2) - 1) * .55 * settling) * easeIn;
    const sourceX = x - horizontal;
    const sourceY = y + from - vertical;
    const lift = feet * gait.lift * up * easeIn;
    if (feet === 0) {
      context.drawImage(artwork, sourceX, sourceY, width, span, 0, from, width, span);
      return;
    }
    const seam = gait.divide - x;
    const bands = [0, seam - 3, seam + 3, width];
    const lifts = [Math.max(0, lift), Math.abs(lift) * .5, Math.max(0, -lift)];
    for (let i = 0; i < lifts.length; i++) {
      const left = bands[i];
      const size = bands[i + 1] - left;
      context.drawImage(artwork, sourceX + left, sourceY + lifts[i], size, span, left, from, size, span);
    }
  }

  function drawMooredBoat(context, { x, y, pivot }, seconds, easeIn) {
    const [tieX, tieY] = pivot;
    const swell = Math.sin(seconds * .92) + .28 * Math.sin(seconds * 1.47 + .6);
    context.save();
    context.translate(tieX - x, tieY - y);
    context.rotate(swell * .009 * easeIn);
    context.drawImage(artwork, -tieX, -tieY);
    context.restore();
  }

  function drawRows(context, surface, seconds, panX, panY, progress, easeIn) {
    const { kind, x, y, width, height, row } = surface;
    for (let from = 0; from < height; from += row) {
      const span = Math.min(row, height - from);
      const ratio = (from + span / 2) / height;
      if (kind === "walk") {
        drawWalkRow(context, surface, from, span, ratio, seconds);
        continue;
      }
      const [dx, dy] = offset(kind, ratio, seconds, panX, panY, progress);
      const sourceX = clamp(x - dx * easeIn, 0, paintingWidth - width);
      const sourceY = clamp(y + from - dy * easeIn, 0, paintingHeight - span);
      context.drawImage(artwork, sourceX, sourceY, width, span, 0, from, width, span);
    }
  }

  function drawLayer(layer, seconds, panX, panY, progress) {
    const { context, surface, matte } = layer;
    const { kind, width, height } = surface;
    const easeIn = Math.min(1, seconds / .95);
    context.clearRect(0, 0, width, height);
    if (kind === "moored") drawMooredBoat(context, surface, seconds, easeIn);
    else drawRows(context, surface, seconds, panX, panY, progress, easeIn);
    context.globalCompositeOperation = "destination-in";
    context.drawImage(matte, 0, 0);
    context.globalCompositeOperation = "source-over";
  }

  window.drawRoadAtmosphere = (world, elapsed, view = {}) => {
    let state = worlds.get(world);
    const activeRole = world.closest(".scene-stage")?.dataset.role;
    if (elapsed <= 0 || (activeRole && activeRole !== "traveler")) {
      if (state) {
        for (const { canvas } of state.layers) canvas.hidden = true;
        state.seconds = -1;
      }
      return;
    }
    if (!artwork.naturalWidth) return;
    if (!state) {
      state = createWorld(world);
      if (!state) return;
      worlds.set(world, state);
    }
    const panX = clamp(view.panX || 0, -1, 1);
    const panY = clamp(view.panY || 0, -1, 1);
    const progress = clamp(view.progress || 0, 0, 1);
    const cameraMoved = Math.abs(panX - state.panX) + Math.abs(panY - state.panY) > .012;
    if (elapsed >= state.seconds && elapsed - state.seconds < 1 / 30 && !cameraMoved) return;
    Object.assign(state, { seconds: elapsed, panX, panY });
    for (const layer of state.layers) {
      if (layer.canvas.hidden) layer.canvas.hidden = false;
      drawLayer(layer, elapsed, panX, panY, progress);
    }
  };
})();
