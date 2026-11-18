(() => {
  "use strict";

  const source = new URL("./assets/boatman-journey.wav", document.currentScript.src).href;
  const cues = [
    { id: "under-bridge", start: 0, end: 5.9, detail: "近处水声带一点桥下反响，头顶的人声很轻" },
    { id: "grip", start: 5.94, end: 6.14, detail: "收住绳索时的轻微触碰" },
    { id: "first-release", start: 6.15, end: 7.35, detail: "第一次松放绳索，6.61 秒木轴轻响" },
    { id: "second-release", start: 9.25, end: 10.6, detail: "第二次松放绳索，9.84 秒木轴轻响" },
    { id: "final-release", start: 12.42, end: 13.7, detail: "最后一段松放，13.05 秒木轴轻响" },
    { id: "hold", start: 14.08, end: 14.28, detail: "绳索收定，桅杆停止下降" },
    { id: "open-river", start: 13.8, end: 18.8, detail: "桥下反响与头顶人声减弱，水面和空气逐渐开阔" }
  ];

  window.boatAudioCues = Object.freeze({
    source,
    duration: 23,
    loop: false,
    suggestedVolume: .56,
    cues: Object.freeze(cues.map(cue => Object.freeze(cue)))
  });
})();
