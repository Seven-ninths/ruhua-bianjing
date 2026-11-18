(() => {
  "use strict";

  const painting = new Image();
  painting.src = "./assets/shopkeeper.webp";
  const openStreet = new Image();
  openStreet.src = "./assets/shopkeeper-street.webp";
  const scenes = new WeakMap();
  const patches = [
    {
      name: "awning", box: [16.2, 17.0, 25.55, 34.3], grid: [4, 4],
      joints: [["cloth", .61, .70, .43, .30]],
    },
    {
      name: "steam", box: [20.0, 40.6, 23.6, 51.6], grid: [3, 4],
      joints: [["steam", .49, .43, .41, .48]],
    },
    {
      name: "street", box: [55.4, 39.8, 72.8, 76.2], grid: [5, 6],
      joints: [["cartPusher", .34, .43, .39, .46], ["cartWheel", .76, .58, .26, .32]],
    },
    {
      name: "far-lantern", box: [79.5, 22.4, 83.8, 34.4], grid: [3, 4],
      joints: [["farLantern", .51, .67, .37, .25]],
    },
    {
      name: "near-lantern", box: [85.5, 18.4, 91.1, 34.4], grid: [3, 4],
      joints: [["nearLantern", .46, .55, .37, .28]],
    },
    {
      name: "customer", box: [25.6, 24.65, 54.3, 83.7], grid: [7, 8],
      joints: [["face", .56, .25, .26, .24], ["shoulders", .55, .48, .43, .25], ["basketArm", .41, .63, .23, .27]],
    },
  ];

  // These outlines are traced onto the original 1672 × 941 scene.
  const walkers = [
    {
      foot: [1342, 729], destination: [1309, 555], phase: .35,
      outline: [[1288,360], [1295,350], [1304,345], [1315,336], [1331,336], [1345,344], [1353,357], [1350,379],
        [1354,391], [1368,407], [1378,430], [1384,467], [1388,498], [1397,524], [1404,551], [1411,568],
        [1425,582], [1428,609], [1424,631], [1416,642], [1393,646], [1383,650], [1388,675], [1387,698], [1391,720],
        [1382,726], [1358,730], [1338,724], [1322,720], [1308,717], [1302,694], [1298,669], [1293,640], [1291,601],
        [1294,573], [1306,550], [1306,534], [1282,520], [1272,499], [1268,480], [1273,450], [1277,426], [1287,405],
        [1303,395], [1308,384], [1298,380], [1293,373]],
    },
    {
      foot: [1253, 723], destination: [1235, 544], phase: 1.9,
      outline: [[1224,478], [1227,470], [1237,466], [1248,463], [1257,464], [1264,472], [1268,486], [1273,497],
        [1278,505], [1289,514], [1299,534], [1306,538], [1310,526], [1317,527], [1318,538], [1311,554], [1304,570],
        [1297,575], [1292,563], [1289,589], [1289,619], [1294,659], [1291,672], [1280,673], [1276,685], [1267,699],
        [1267,713], [1261,723], [1250,722], [1241,712], [1236,698], [1230,703], [1223,698], [1220,674], [1215,676],
        [1216,649], [1216,625], [1206,625], [1202,617], [1205,592], [1209,569], [1210,545], [1218,525], [1228,510],
        [1238,504], [1231,493], [1224,490]],
    },
  ];

  function gesture(time, from, to) {
    const t = Math.max(0, Math.min(1, (time - from) / (to - from)));
    return t * t * (3 - 2 * t);
  }

  function cues(time) {
    const start = gesture(time, 0, 1.8);
    const lookDown = gesture(time, 1.7, 4.4) - gesture(time, 6.4, 9.2);
    const lookUp = gesture(time, 7.5, 11.8);
    const grip = gesture(time, 2.8, 5.7) - gesture(time, 8.1, 12.7);
    const breath = Math.sin(time * 1.72) * start;
    const wind = Math.sin(time * 1.39) * start;
    const pace = Math.sin(time * 3.05) * start;
    return {
      face: [4 * lookDown - 4.5 * lookUp + breath, 10 * lookDown - 5 * lookUp],
      shoulders: [5 * lookDown - 2 * lookUp + 2.5 * breath, 5 * lookDown - 2 * lookUp + breath],
      basketArm: [10 * grip + 2 * breath, -6.5 * grip],
      cloth: [4.8 * wind, (3 * Math.sin(time * 1.16) + 2.6 * wind) * start],
      steam: [5 * Math.sin(time * 2.0) * start, -3.1 * Math.sin(time * 1.19) * start],
      cartPusher: [5 * pace, -2.8 * Math.cos(time * 3.05) * start],
      cartWheel: [2.9 * pace, 1.6 * Math.sin(time * 3.05 + .6) * start],
      farLantern: [1.9 * Math.sin(time * 1.29 + .48) * start, -.38 * wind],
      nearLantern: [3.6 * Math.sin(time * 1.02 - .3) * start, -.58 * wind],
    };
  }

  function clipWalker(walker) {
    const xs = walker.outline.map(([x]) => x);
    const ys = walker.outline.map(([, y]) => y);
    const x = Math.min(...xs) - 2;
    const y = Math.min(...ys) - 2;
    const sprite = document.createElement("canvas");
    sprite.width = Math.max(...xs) - x + 2;
    sprite.height = Math.max(...ys) - y + 2;
    const context = sprite.getContext("2d");
    if (!context) return null;
    context.beginPath();
    walker.outline.forEach(([px, py], i) => {
      if (i) context.lineTo(px - x, py - y);
      else context.moveTo(px - x, py - y);
    });
    context.closePath();
    context.clip();
    context.drawImage(painting, x, y, sprite.width, sprite.height, 0, 0, sprite.width, sprite.height);
    return { ...walker, sprite, origin: [walker.foot[0] - x, walker.foot[1] - y] };
  }

  function mountStreet(layer) {
    if (!openStreet.complete || openStreet.naturalWidth !== painting.naturalWidth) return null;
    const street = { x: 1186, y: 315, width: 263, height: 435 };
    const background = document.createElement("canvas");
    const movement = document.createElement("canvas");
    for (const canvas of [background, movement]) {
      canvas.width = street.width;
      canvas.height = street.height;
      Object.assign(canvas.style, {
        position: "absolute", pointerEvents: "none",
        left: String(street.x / painting.naturalWidth * 100) + "%",
        top: String(street.y / painting.naturalHeight * 100) + "%",
        width: String(street.width / painting.naturalWidth * 100) + "%",
        height: String(street.height / painting.naturalHeight * 100) + "%",
      });
    }
    background.dataset.shopMotion = "open-street";
    movement.dataset.shopMotion = "walking-pair";
    const behind = background.getContext("2d");
    const action = movement.getContext("2d");
    const people = walkers.map(clipWalker).filter(Boolean);
    if (!behind || !action || people.length !== walkers.length) return null;

    behind.drawImage(openStreet, street.x, street.y, street.width, street.height, 0, 0, street.width, street.height);
    behind.globalCompositeOperation = "destination-in";
    for (const horizontal of [true, false]) {
      const length = horizontal ? street.width : street.height;
      const mask = behind.createLinearGradient(0, 0, horizontal ? length : 0, horizontal ? 0 : length);
      mask.addColorStop(0, "transparent");
      mask.addColorStop(14 / length, "#000");
      mask.addColorStop(1 - 14 / length, "#000");
      mask.addColorStop(1, "transparent");
      behind.fillStyle = mask;
      behind.fillRect(0, 0, street.width, street.height);
    }
    layer.append(background, movement);
    return { ...street, people, action };
  }

  function drawWalker(context, walker, time, progress, street) {
    const { sprite, origin, foot, destination } = walker;
    const scale = 1 - .42 * progress;
    const stride = gesture(time, 2.2, 3.8) * (1 - gesture(time, 18.5, 20.6));
    const pace = Math.sin(progress * 17.4 * Math.PI * 2 + walker.phase) * stride;
    const reach = Math.min(1, .92 * progress + .08 * progress ** 2);
    const left = foot[0] + (destination[0] - foot[0]) * reach - street.x;
    const ground = foot[1] + (destination[1] - foot[1]) * progress - street.y;
    const hem = Math.round(sprite.height * .68);

    context.save();
    context.translate(left, ground);
    context.scale(scale, scale);
    context.fillStyle = "rgba(83,63,40,.15)";
    context.beginPath();
    context.ellipse(0, -1, 19, 4, 0, 0, Math.PI * 2);
    context.fill();
    context.translate(-origin[0] + 1.7 * pace, -origin[1] - 2.1 * Math.abs(pace));
    context.drawImage(sprite, 0, 0, sprite.width, hem, 0, 0, sprite.width, hem);

    const middle = Math.round(sprite.width * .48);
    for (let row = hem; row < sprite.height; row += 4) {
      const count = Math.min(4, sprite.height - row);
      const bend = ((row - hem) / (sprite.height - hem)) ** 1.65;
      const leftLift = Math.max(0, pace) * bend * 9;
      const rightLift = Math.max(0, -pace) * bend * 9;
      context.drawImage(sprite, 0, row, middle, count, -3.3 * pace * bend, row - leftLift, middle + .2, count + .42);
      context.drawImage(sprite, middle, row, sprite.width - middle, count,
        middle + 2.7 * pace * bend, row - rightLift, sprite.width - middle, count + .42);
    }
    context.restore();
  }

  function paintStreet(street, time) {
    const { action, width, height, people } = street;
    const progress = .18 * gesture(time, 2.2, 6) + .70 * gesture(time, 4.5, 17.2) + .12 * gesture(time, 15.5, 20.6);
    action.clearRect(0, 0, width, height);
    people.forEach(walker => drawWalker(action, walker, time, progress, street));
  }

  function makePatch(spec, layer) {
    const [left, top, right, bottom] = spec.box;
    const sourceX = Math.round(painting.naturalWidth * left / 100);
    const sourceY = Math.round(painting.naturalHeight * top / 100);
    const width = Math.round(painting.naturalWidth * right / 100) - sourceX;
    const height = Math.round(painting.naturalHeight * bottom / 100) - sourceY;

    const canvas = document.createElement("canvas");
    const original = document.createElement("canvas");
    for (const surface of [canvas, original]) {
      surface.width = width;
      surface.height = height;
    }
    const context = canvas.getContext("2d", { alpha: false });
    const source = original.getContext("2d", { alpha: false });
    if (!context || !source) return null;
    source.drawImage(painting, sourceX, sourceY, width, height, 0, 0, width, height);
    const percent = (value, total) => String(value / total * 100) + "%";
    canvas.dataset.shopMotion = spec.name;
    Object.assign(canvas.style, {
      position: "absolute",
      left: percent(sourceX, painting.naturalWidth),
      top: percent(sourceY, painting.naturalHeight),
      width: percent(width, painting.naturalWidth),
      height: percent(height, painting.naturalHeight),
    });

    const [columns, rows] = spec.grid;
    const grid = Array.from({ length: rows + 1 }, (_, row) =>
      Array.from({ length: columns + 1 }, (_, column) => {
        const u = column / columns;
        const v = row / rows;
        // Fixed boundaries keep the layer registered against the same painted pixels.
        const pinned = row === 0 || column === 0 || row === rows || column === columns;
        const joints = pinned ? [] : spec.joints.map(([name, x, y, spreadX, spreadY]) => {
          const distance = ((u - x) / spreadX) ** 2 + ((v - y) / spreadY) ** 2;
          return [name, Math.exp(-distance)];
        });
        return { x: u * width, y: v * height, joints };
      })
    );
    const triangles = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const topLeft = grid[row][column];
        const topRight = grid[row][column + 1];
        const bottomLeft = grid[row + 1][column];
        const bottomRight = grid[row + 1][column + 1];
        triangles.push([topLeft, topRight, bottomLeft], [bottomRight, bottomLeft, topRight]);
      }
    }
    layer.append(canvas);
    return { context, original, grid, triangles };
  }

  function drawTriangle(context, original, anchor, horizontal, vertical) {
    const a = (horizontal.dx - anchor.dx) / (horizontal.x - anchor.x);
    const b = (horizontal.dy - anchor.dy) / (horizontal.x - anchor.x);
    const c = (vertical.dx - anchor.dx) / (vertical.y - anchor.y);
    const d = (vertical.dy - anchor.dy) / (vertical.y - anchor.y);
    const centerX = (anchor.dx + horizontal.dx + vertical.dx) / 3;
    const centerY = (anchor.dy + horizontal.dy + vertical.dy) / 3;

    context.save();
    context.beginPath();
    [anchor, horizontal, vertical].forEach((point, index) => {
      // Overlap adjoining triangles by a fraction of a pixel to cover antialias seams.
      const radius = Math.hypot(point.dx - centerX, point.dy - centerY) || 1;
      const x = point.dx + .58 * (point.dx - centerX) / radius;
      const y = point.dy + .58 * (point.dy - centerY) / radius;
      if (index) context.lineTo(x, y);
      else context.moveTo(x, y);
    });
    context.closePath();
    context.clip();
    context.transform(a, b, c, d, anchor.dx - a * anchor.x - c * anchor.y, anchor.dy - b * anchor.x - d * anchor.y);
    context.drawImage(original, 0, 0);
    context.restore();
  }

  function paintPatch(patch, motion) {
    const { context, original, grid, triangles } = patch;
    context.drawImage(original, 0, 0);
    for (const row of grid) {
      for (const point of row) {
        point.dx = point.x;
        point.dy = point.y;
        for (const [name, strength] of point.joints) {
          point.dx += motion[name][0] * strength;
          point.dy += motion[name][1] * strength;
        }
      }
    }
    triangles.forEach(triangle => drawTriangle(context, original, ...triangle));
  }

  function mount(world) {
    const art = world.querySelector(".scene-art");
    if (!art || !painting.complete || !painting.naturalWidth) return null;
    const layer = document.createElement("div");
    layer.dataset.sceneEffect = "shopkeeper";
    layer.setAttribute("aria-hidden", "true");
    Object.assign(layer.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    art.after(layer);
    return { layer, patches: patches.map(spec => makePatch(spec, layer)).filter(Boolean), street: null, frame: -1 };
  }

  window.drawShopPeople = function drawShopPeople(world, elapsed) {
    let scene = scenes.get(world);
    if (!scene) {
      scene = mount(world);
      if (!scene) return;
      scenes.set(world, scene);
    }
    scene.layer.hidden = elapsed === 0;
    scene.layer.style.visibility = scene.layer.hidden ? "hidden" : "";
    if (scene.layer.hidden) {
      scene.frame = -1;
      return;
    }
    const frame = Math.floor(elapsed * 24);
    if (scene.frame === frame) return;
    scene.frame = frame;
    const motion = cues(elapsed);
    scene.patches.forEach(patch => paintPatch(patch, motion));
    scene.street ??= mountStreet(scene.layer);
    if (scene.street) paintStreet(scene.street, elapsed);
  };
})();
