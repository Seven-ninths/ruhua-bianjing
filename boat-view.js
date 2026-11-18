(() => {
  "use strict";

  const deckArt = new Image();
  const riverArt = new Image();
  deckArt.src = "./assets/boat-deck.webp";
  riverArt.src = "./assets/boat-river.png";

  const width = 1672;
  const height = 941;
  const layers = new WeakMap();
  const hull = new Path2D(
    "M0 826L476 684 478 666 487 660 536 655 553 625 582 620 " +
    "C661 583 747 587 812 587S960 596 1001 635L1030 668 1093 681 " +
    "L1093 662 1102 657 1130 661 1135 689 1311 746 1351 743 1379 749 " +
    "L1383 777 1672 869V941H0Z " +
    "M1138 724L1174 735 1174 791 1138 775Z " +
    "M1202 747L1317 782 1317 803 1278 809 1202 785Z"
  );

  function canvasLayer(className) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.className = className;
    return canvas;
  }

  function mount(world) {
    const shore = document.createElement("div");
    shore.className = "boat-shore";
    shore.dataset.sceneEffect = "boatman";
    const river = canvasLayer("scene-art boat-river-art");
    const deck = canvasLayer("boat-deck-layer");
    deck.dataset.sceneEffect = "boatman";
    river.getContext("2d").drawImage(riverArt, 0, 0);
    const context = deck.getContext("2d");
    context.clip(hull, "evenodd");
    context.drawImage(deckArt, 0, 0);
    shore.append(river);
    world.querySelector("#scene-art").after(shore, deck);
    world.dataset.boatLayers = "ready";
    return shore;
  }

  window.drawBoatView = (world, [surgeX, surgeY, distance]) => {
    let shore = layers.get(world);
    if (!shore) {
      if (deckArt.naturalWidth !== width || deckArt.naturalHeight !== height ||
          riverArt.naturalWidth !== width || riverArt.naturalHeight !== height) return null;
      shore = mount(world);
      layers.set(world, shore);
    }
    shore.style.transform = `translate(${surgeX.toFixed(3)}%, ${surgeY.toFixed(3)}%) scale(${distance.toFixed(4)})`;
    return shore;
  };
})();
