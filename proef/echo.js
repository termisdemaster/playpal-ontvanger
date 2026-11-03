// Run: node proef/echo.js index.html  (exit 0 = a "speler" pause from Play-Pal is executed here and not echoed back)
// Simulates CAF: speler.pause()/play() go through the PAUSE/PLAY interceptors asynchronously, like on the speaker.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const code = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const any = () => new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : any(), apply: () => any(), construct: () => any() });
const gemeld = [], interceptors = {}, listeners = {}; let gepauzeerd = false;
const speler = new Proxy({
  setMessageInterceptor: (t, f) => { interceptors[t] = f; },
  pause: () => setTimeout(() => { const r = interceptors.PAUSE({ type: 'PAUSE' }); if (r) gepauzeerd = true; }, 3),
  play: () => setTimeout(() => { const r = interceptors.PLAY({ type: 'PLAY' }); if (r) gepauzeerd = false; }, 3),
}, { get: (t, k) => k in t ? t[k] : any() });
const ctx = new Proxy({
  getPlayerManager: () => speler,
  addCustomMessageListener: (ns, f) => { listeners[ns] = f; },
  sendCustomMessage: (ns, s, m) => gemeld.push(typeof m === 'string' ? JSON.parse(m) : m),
}, { get: (t, k) => k in t ? t[k] : any() });
const MT = new Proxy({}, { get: (t, k) => k });
global.cast = { framework: new Proxy({ CastReceiverContext: { getInstance: () => ctx }, messages: { MessageType: MT, Command: any() },
  system: new Proxy({}, { get: () => new Proxy({}, { get: (t, k) => k }) }), PlaybackConfig: function () {}, CastReceiverOptions: function () {} }, { get: (t, k) => k in t ? t[k] : any() }) };
global.document = any(); global.window = global; global.navigator = { userAgent: 'proef' };
const echteInterval = setInterval; global.setInterval = () => 0;
new Function(code)();
const ns = Object.keys(listeners)[0];
listeners[ns]({ data: { type: 'speler', opdracht: 'pauze' }, senderId: 'pc' });
setTimeout(() => {
  const terug = gemeld.filter(m => m.type === 'opdracht');
  console.log(JSON.stringify({ gepauzeerd, opdrachtTerug: terug.map(m => m.opdracht), gezien: gemeld.filter(m => m.type === 'gezien').map(m => m.bericht + ':' + m.inhoud) }));
  process.exit(terug.length === 0 && gepauzeerd ? 0 : 1);
}, 50);
