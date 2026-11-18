(() => {
  "use strict";

  // These coordinates are taken from the painted foreground walker in traveler.webp.
  const painting = { width: 1672, height: 941 };
  const sourceTile = { x: 326, y: 454, width: 180, height: 264 };
  const walkingArea = { x: 326, y: 440, width: 264, height: 278 };
  const journeyDuration = 27;
  const head = new Path2D(`
    M 382 490 Q 381 485 387 483 L 394 483 Q 400 479 406 484
    Q 414 485 416 495 L 414 520 L 412 522 L 410 516 L 390 515
    L 383 522 L 382 521 L 387 499 Q 381 498 382 490 Z
  `);
  const coat = new Path2D(`
    M 383 519 Q 391 513 403 513 L 412 518 Q 426 520 431 533
    Q 435 542 436 552 Q 440 562 437 580 Q 435 587 429 592
    L 432 599 L 436 606 L 432 612 L 427 603 L 424 592
    Q 425 614 427 628 L 429 643 Q 422 649 415 645
    Q 404 642 398 642 Q 389 645 382 642 Q 376 647 367 643
    L 369 619 L 364 621 L 358 617 L 359 610 L 365 591
    Q 359 586 358 575 L 357 546 L 354 533 Q 355 529 362 529
    Q 362 519 368 517 Q 376 515 379 521 L 381 520 Z
    M 365 528 L 372 528 L 377 522 Q 373 518 368 520 Q 365 523 365 528 Z
  `);
  const leftLeg = new Path2D(`
    M 374 636 L 397 638 L 400 648 L 394 662 L 395 674
    Q 399 680 396 686 Q 396 691 390 691 Q 384 692 383 685
    L 384 672 L 383 666 Q 376 667 376 660 Z
  `);
  const rightLeg = new Path2D(`
    M 396 635 L 422 638 L 421 653 Q 420 665 416 667
    L 411 669 L 408 683 L 413 686 Q 419 688 416 693
    Q 411 697 399 697 L 397 695 L 399 678 L 399 667
    L 394 663 L 396 652 Z
  `);
  const erased = new Path2D(`
    M 376 486 Q 393 474 413 480 Q 421 486 420 515
    Q 439 524 442 560 Q 444 581 435 595 L 441 612
    L 434 621 L 430 616 L 433 646 L 424 651 L 422 672
    L 415 682 Q 425 687 423 698 Q 397 705 380 700
    L 365 697 L 370 689 L 377 685 L 378 671 Q 371 667 370 648
    L 362 644 L 362 625 L 354 622 L 353 610 L 359 593
    Q 353 587 353 572 L 350 532 L 357 526 Q 358 510 373 512
    L 377 514 L 381 501 Q 375 496 376 486 Z
  `);
  const scriptUrl = document.currentScript.src;
  const readImage = file => {
    const image = new Image();
    image.src = new URL(file, scriptUrl);
    return image;
  };
  const source = readImage("./assets/traveler.webp");
  const clean = readImage("./assets/traveler-clean.webp");
  const scenes = new WeakMap();

  function makeCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function makeCutout(path) {
    const { x, y, width, height } = sourceTile;
    const canvas = makeCanvas(width, height);
    const context = canvas.getContext("2d");
    context.translate(-x, -y);
    context.clip(path, "evenodd");
    context.drawImage(source, 0, 0, painting.width, painting.height);
    return canvas;
  }

  function makeCleanTile() {
    const { x, y, width, height } = sourceTile;
    const matte = makeCanvas(width, height);
    const mask = matte.getContext("2d");
    mask.translate(-x, -y);
    mask.filter = "blur(2px)";
    mask.fill(erased);

    const canvas = makeCanvas(width, height);
    const context = canvas.getContext("2d");
    context.drawImage(clean, 0, 0, width, height);
    context.globalCompositeOperation = "destination-in";
    context.drawImage(matte, 0, 0);
    return canvas;
  }

  function createScene(world) {
    const { x, y, width, height } = walkingArea;
    const canvas = makeCanvas(width, height);
    canvas.className = "painted-traveler";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "absolute",
      left: `${x / painting.width * 100}%`,
      top: `${y / painting.height * 100}%`,
      width: `${width / painting.width * 100}%`,
      height: `${height / painting.height * 100}%`,
      pointerEvents: "none",
    });
    world.append(canvas);
    return {
      canvas,
      context: canvas.getContext("2d"),
      tile: makeCleanTile(),
      coat: makeCutout(coat),
      head: makeCutout(head),
      leftLeg: makeCutout(leftLeg),
      rightLeg: makeCutout(rightLeg),
      elapsed: -1,
    };
  }

  function paintPart(context, sprite, x, y, rotation, height = 1) {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.scale(1, height);
    context.drawImage(sprite, sourceTile.x - x, sourceTile.y - y);
    context.restore();
  }

  function positionOnRoad(progress) {
    return {
      x: 395 + 125 * progress * (.69 + .31 * progress),
      y: 694 - 62 * progress * (1.18 - .18 * progress),
      scale: 1 - .24 * progress,
    };
  }

  function worldFoot(progress, foot) {
    const ground = positionOnRoad(progress);
    return {
      x: ground.x + (foot[0] - 395) * ground.scale,
      y: ground.y + (foot[1] - 694) * ground.scale,
    };
  }

  function plantFoot(progress, offset, foot, ground) {
    const cycles = 18;
    const step = progress * cycles + offset;
    const index = Math.floor(step);
    const phase = step - index;
    const previous = worldFoot(Math.max(0, (index - offset) / cycles), foot);
    const next = worldFoot(Math.min(1, (index + 1 - offset) / cycles), foot);
    const lift = Math.max(0, (phase - .6) / .4);
    const swing = lift * lift * (3 - 2 * lift);
    return {
      x: 395 + (previous.x + (next.x - previous.x) * swing - ground.x) / ground.scale,
      y: 694 + (previous.y + (next.y - previous.y) * swing - ground.y) / ground.scale
        - Math.sin(lift * Math.PI) * 5,
    };
  }

  function paintLeg(context, sprite, hip, foot, contact, sway, bob) {
    const x = hip[0] + sway;
    const y = hip[1] - bob;
    const legX = foot[0] - hip[0];
    const legY = foot[1] - hip[1];
    const deltaX = contact.x - x - legX;
    const deltaY = contact.y - y - legY;
    const lengthSquared = legX * legX + legY * legY;
    context.save();
    context.translate(x, y);
    // Hold the supporting foot on the road while the hips move past it.
    context.transform(
      1 + deltaX * legX / lengthSquared, deltaY * legX / lengthSquared,
      deltaX * legY / lengthSquared, 1 + deltaY * legY / lengthSquared, 0, 0
    );
    context.drawImage(sprite, sourceTile.x - hip[0], sourceTile.y - hip[1]);
    context.restore();
  }

  window.drawTravelerPeople = (world, elapsed) => {
    let scene = scenes.get(world);
    if (elapsed <= 0) {
      if (scene) scene.canvas.hidden = true;
      return;
    }
    if (!source.naturalWidth || !clean.naturalWidth) return;
    if (!scene) {
      scene = createScene(world);
      scenes.set(world, scene);
    }
    if (scene.canvas.hidden) scene.canvas.hidden = false;
    if (scene.elapsed === elapsed) return;
    scene.elapsed = elapsed;
    const { context } = scene;
    const time = Math.min(elapsed, journeyDuration);
    const travel = Math.max(0, Math.min(1, (time - .6) / 23.6));
    const progress = travel * travel * (3 - 2 * travel);
    const phase = progress * Math.PI * 2 * 18;
    const blend = Math.min(1, travel * 8, (1 - travel) * 8);
    const stride = Math.sin(phase) * blend;
    const sway = Math.cos(phase) * blend;
    const bob = (1 - Math.cos(phase * 2)) * .94 * blend;
    const ground = positionOnRoad(progress);
    context.clearRect(0, 0, walkingArea.width, walkingArea.height);
    context.drawImage(scene.tile, sourceTile.x - walkingArea.x, sourceTile.y - walkingArea.y);

    context.save();
    context.translate(ground.x - walkingArea.x, ground.y - walkingArea.y);
    context.scale(ground.scale, ground.scale);
    context.translate(-395, -694);

    context.fillStyle = "rgba(82, 62, 37, 0.33)";
    context.filter = "blur(2px)";
    context.beginPath();
    context.ellipse(395, 695, 18, 3.4, 0, 0, Math.PI * 2);
    context.fill();
    context.filter = "none";

    const leftFoot = [390, 689];
    const rightFoot = [407, 694];
    const left = () => paintLeg(context, scene.leftLeg, [387, 643], leftFoot,
      plantFoot(progress, 0, leftFoot, ground), sway * 1.5, bob);
    const right = () => paintLeg(context, scene.rightLeg, [406, 643], rightFoot,
      plantFoot(progress, .5, rightFoot, ground), sway * 1.5, bob);
    if (stride > 0) { left(); right(); } else { right(); left(); }
    context.translate(sway * 1.5, -bob);
    paintPart(context, scene.coat, 397, 612, sway * 0.02);
    paintPart(context, scene.head, 400, 517, sway * 0.029 + stride * 0.011);
    context.restore();
  };
})();
