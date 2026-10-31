// Browser prompt-cycle check for an Iplo day. Run the page first
// (http://localhost:3004/dev/iplo-repro?day=<N>, Page.bringToFront so media
// is not throttled), then evaluate this with START replaced by the audio time
// just before a prompt's openAt. Returns text transitions; FLICKER lines mark
// a card/text that vanished and returned within 1.2s.
//
// (async () => {
//   const START = 106.5;             // <-- set: a few seconds before openAt
//   const LIMIT = START + 12;        // how far to run
//   const a = document.querySelector('audio');
//   a.muted = true;
//   a.currentTime = START;
//   window.__rows = [];
//   window.__nos = [];
//   window.__iv = setInterval(() => {
//     const btn = [...document.querySelectorAll('button')]
//       .find((b) => b.innerText.trim() === 'No sé');
//     if (btn) { btn.click(); window.__nos.push(Number(a.currentTime.toFixed(2))); }
//   }, 150);
//   const push = () => {
//     const m = document.querySelector('main');
//     window.__rows.push([Number(a.currentTime.toFixed(3)), a.paused,
//       m ? m.innerText.replace(/\s+/g, ' ').slice(0, 70) : '']);
//     if (a.currentTime < LIMIT && !window.__stop) requestAnimationFrame(push);
//     else window.__done = true;
//   };
//   requestAnimationFrame(push);
//   a.play();
//   return 'running';
// })()
//
// Then poll until window.__done and compress:
//
// (() => {
//   clearInterval(window.__iv); window.__stop = true;
//   const rows = window.__rows;
//   const out = []; let prev = null;
//   for (const [t, paused, q] of rows) {
//     const key = q + (paused ? ' P' : '');
//     if (key !== prev) { out.push([t, paused, q]); prev = key; }
//   }
//   const flicker = [];
//   for (let i = 2; i < out.length; i++) {
//     const [t0,, q0] = out[i - 2]; const [t1,, q1] = out[i - 1]; const [t2,, q2] = out[i];
//     if (q0 === q2 && q0 !== q1 && t2 - t0 <= 1.2)
//       flicker.push(`FLICKER ${t0.toFixed(2)} -> ${t1.toFixed(2)} -> ${t2.toFixed(2)}: ${q0.slice(0, 50)}`);
//   }
//   return { transitions: out, flicker, answered: window.__nos };
// })()
//
// PASS = no flicker entries and the card transition frames are continuous.