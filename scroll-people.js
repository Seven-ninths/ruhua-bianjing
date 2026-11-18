(() => {
  "use strict";

  const installedWorlds = new WeakSet();
  const figures = [
    { name: "traveler-step", box: [79.60, 78.7, 80.00, 92.5], joint: [0.52, 0.73], travel: 6, period: 3150, phase: 250 },
    { name: "bridge-spectator", box: [50.97, 5.9, 51.25, 15.4], joint: [0.53, 0.40], travel: 4, period: 4600, phase: 1100 },
    { name: "boat-worker", box: [51.44, 24.5, 51.77, 35.7], joint: [0.57, 0.54], travel: 5, period: 3650, phase: 500 },
    { name: "shop-assistant", box: [15.63, 38.0, 16.01, 48.1], joint: [0.53, 0.65], travel: 5, period: 4300, phase: 750 },
  ];
  const waters = [
    { name: "suburban-bank", box: [95.6, 76, 97.5, 92], travel: 5, phase: .7 },
    { name: "river-moorings", box: [65.6, 61, 69.6, 96], travel: 7, phase: 2.2 },
    { name: "beneath-rainbow-bridge", box: [50.1, 45, 52.5, 53], travel: 5, phase: 3.4 },
  ];

  function makeSurface(box, image) {
    const [left, top, right, bottom] = box;
    const x = Math.round(image.naturalWidth * left / 100);
    const y = Math.round(image.naturalHeight * top / 100);
    const width = Math.round(image.naturalWidth * right / 100) - x;
    const height = Math.round(image.naturalHeight * bottom / 100) - y;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "absolute",
      pointerEvents: "none",
      left: `${x / image.naturalWidth * 100}%`,
      top: `${y / image.naturalHeight * 100}%`,
      width: `${width / image.naturalWidth * 100}%`,
      height: `${height / image.naturalHeight * 100}%`,
    });

    const field = canvas.getContext("2d", { alpha: false });
    return field ? { canvas, field, x, y, width, height } : null;
  }

  function makeFigurePatch(figure, world, image) {
    const surface = makeSurface(figure.box, image);
    if (!surface) return null;
    const { canvas, field, x, y, width, height } = surface;
    canvas.dataset.scrollFigure = figure.name;

    // Pin the patch's edges to the painting. The short rows bend only near the joint.
    const [jointX, jointY] = figure.joint;
    const seam = Math.round(width * jointX);
    const rowWeights = Array.from({ length: height }, (_, row) => {
      const fraction = row / Math.max(height - 1, 1);
      const distance = fraction < jointY ? (jointY - fraction) / jointY : (fraction - jointY) / (1 - jointY);
      return (1 + Math.cos(Math.PI * distance)) / 2;
    });

    function paint(now) {
      const cycle = ((now + figure.phase) % figure.period) / figure.period;
      const movement = Math.sin(cycle * Math.PI * 2) * figure.travel;
      for (let row = 0; row < height; row++) {
        const bend = seam + Math.round(movement * rowWeights[row]);
        field.drawImage(image, x, y + row, seam, 1, 0, row, bend, 1);
        field.drawImage(image, x + seam, y + row, width - seam, 1, bend, row, width - bend, 1);
      }
    }

    field.drawImage(image, x, y, width, height, 0, 0, width, height);
    world.append(canvas);
    return { canvas, paint };
  }

  function makeWaterPatch(water, world, image) {
    const surface = makeSurface(water.box, image);
    if (!surface) return null;
    const { canvas, field, x, y, width, height } = surface;
    canvas.dataset.scrollWater = water.name;
    canvas.style.maskImage = "radial-gradient(ellipse closest-side, #000 38%, #000b 67%, transparent 100%)";

    function paint(now) {
      const phase = now / 1150 + water.phase;
      for (let row = 0; row < height; row += 2) {
        const strip = Math.min(2, height - row);
        const bend = row * .085 + phase;
        const flowX = water.travel * (.73 * Math.sin(bend) + .27 * Math.sin(bend * 1.71 - phase * .5));
        const flowY = 1.15 * Math.sin(row * .05 - phase * .83);
        field.drawImage(image, x + flowX, y + row + flowY, width, strip, 0, row, width, strip);
      }
    }

    field.drawImage(image, x, y, width, height, 0, 0, width, height);
    world.append(canvas);
    return { canvas, paint };
  }

  window.installScrollPeople = function installScrollPeople(world, image) {
    if (!world || !image?.naturalWidth || installedWorlds.has(world)) return;
    installedWorlds.add(world);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const patches = [
      ...waters.map(water => makeWaterPatch(water, world, image)),
      ...figures.map(figure => makeFigurePatch(figure, world, image)),
    ].filter(Boolean);
    const byCanvas = new Map(patches.map(patch => [patch.canvas, patch]));
    const active = new Set();
    let frame = 0;
    let lastDraw = -Infinity;

    function tick(now) {
      frame = 0;
      if (reducedMotion.matches || !active.size) return;
      if (now - lastDraw >= 48) {
        lastDraw = now;
        active.forEach(patch => patch.paint(now));
      }
      frame = requestAnimationFrame(tick);
    }

    function schedule() {
      if (!frame && active.size && !reducedMotion.matches) frame = requestAnimationFrame(tick);
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const patch = byCanvas.get(entry.target);
        if (entry.isIntersecting) active.add(patch);
        else active.delete(patch);
      }
      schedule();
    });

    function syncMotionPreference() {
      active.clear();
      observer.disconnect();
      patches.forEach(({ canvas }) => {
        canvas.hidden = reducedMotion.matches;
        if (!reducedMotion.matches) observer.observe(canvas);
      });
      if (reducedMotion.matches && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    }

    reducedMotion.addEventListener("change", syncMotionPreference);
    syncMotionPreference();
  };
})();
