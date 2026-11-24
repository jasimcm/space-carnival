/* Space Carnival landing page toys:
   1. Light up TinkerSpace: wire battery -> switch -> fairy lights, flip the switch.
   2. Print your ticket: a carnival ticket drawn on canvas, downloadable as a PNG. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const pop = (x, y) => { if (typeof burst === 'function' && !calm.matches) burst(x, y); };

  /* ---------------- Light up TinkerSpace ---------------- */
  const lab = document.querySelector('.lab');
  if (lab) {
    const svg = lab.querySelector('svg');
    const status = lab.querySelector('.lab-status span');
    const step = lab.querySelector('.lab-status b');
    // building drawn at x 370, y 190, 620 x 401 in the 1000 x 620 viewBox
    const BX = 370, BY = 190, BW = 620, BH = 401;
    const bulbs = [[5.53,14.96],[6.19,17.4],[6.99,19.7],[10.03,21.55],[10.66,9.92],[11.97,20.3],[12.42,10.26],[14.01,19.28],[14.81,10.93],[15.69,24.6],[16.35,11.14],[16.8,25.09],[18.49,11.52],[18.51,26.38],[20.4,12.05],[22.68,12.64],[23.96,24.12],[24.87,12.93],[25.57,28.37],[26.62,13.48],[27.19,30.22],[28.59,13.58],[28.82,31.99],[30.41,13.92],[32.05,14.02],[33.8,13.87],[35.19,33.58],[36.02,14.07],[36.25,35.24],[37.65,36.45],[37.72,13.75],[38.89,13.4],[39.56,37.18],[46.16,38.05],[47.11,39.95],[48.37,41.18],[50.84,34.15],[51.98,34.87],[52.03,42.45],[53.63,33.86],[55.07,42.44],[56.1,43.96],[56.38,33.72],[57.28,32.64],[57.75,30.76],[58.68,48.11],[59.01,31.68],[60.82,31.0],[62.29,30.23],[63.07,48.01],[63.41,30.67],[63.95,49.75],[64.6,30.23],[65.39,28.46],[66.01,58.07],[66.65,29.11],[67.32,58.55],[67.63,51.14],[68.38,31.65],[68.65,58.48],[68.93,49.81],[69.92,58.65],[69.95,31.64],[70.18,52.49],[71.4,32.42],[71.89,33.99],[71.93,58.06],[72.07,53.87],[72.37,35.61],[73.33,57.46],[73.72,36.13],[74.35,56.6],[76.05,35.57],[76.53,37.26],[77.44,38.89],[79.58,38.61],[80.99,41.01],[81.73,42.4],[83.0,42.91],[84.26,42.26],[85.47,44.16],[86.43,47.26],[89.24,47.51],[89.95,48.89],[91.18,49.83],[92.84,49.33]];
    const g = svg.querySelector('.bulbs');
    bulbs.forEach(([px, py], i) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', (BX + px / 100 * BW).toFixed(1));
      c.setAttribute('cy', (BY + py / 100 * BH).toFixed(1));
      c.setAttribute('r', 5.5);
      c.setAttribute('class', 'bulb');
      c.style.setProperty('--i', i);
      c.style.setProperty('--tw', (i * 37 % 100) / 100 * 1.6 + 's');
      g.appendChild(c);
    });

    const T = id => svg.querySelector('#' + id);
    const pt = id => { const c = T(id); return { x: +c.getAttribute('cx'), y: +c.getAttribute('cy') }; };
    // the two wires the visitor has to make, in order
    const links = [
      { a: 't-bat', b: 't-swa', wire: T('w1'), msg: 'Now run a wire from the switch to the fairy lights' },
      { a: 't-swb', b: 't-led', wire: T('w2'), msg: 'All wired. Flip the switch!' }
    ];
    let done = 0, on = false, drag = null, picked = null, busy = false;
    const lever = T('lever');

    // each wire is a black outline path plus a coloured path on top
    const setD = (g, d) => g.querySelectorAll('path').forEach(p => d ? p.setAttribute('d', d) : p.removeAttribute('d'));
    const sag = (p, q) => {
      const dip = Math.max(40, Math.abs(q.x - p.x) * .35);
      return `M${p.x} ${p.y} C${p.x} ${p.y + dip} ${q.x} ${q.y + dip} ${q.x} ${q.y}`;
    };
    const say = (n, msg) => { step.textContent = n; status.textContent = msg; };
    const hint = () => {
      svg.querySelectorAll('.term').forEach(t => t.classList.remove('next'));
      if (done < links.length) { T(links[done].a).classList.add('next'); T(links[done].b).classList.add('next'); }
      else if (!on) T('switch').classList.add('next');
      if (done >= links.length || on) T('switch').classList.toggle('next', !on);
      else T('switch').classList.remove('next');
    };
    const connect = (instant) => {
      const L = links[done], p = pt(L.a), q = pt(L.b);
      setD(L.wire, sag(p, q));
      L.wire.classList.add('made');
      if (!instant) L.wire.classList.add('fresh');
      done++;
      say(done + 1 + '/3', L.msg);
      hint();
    };
    const setOn = val => {
      if (val && done < links.length) {
        say(done + 1 + '/3', 'Click... nothing. The circuit isn’t closed yet');
        lever.classList.add('nope'); setTimeout(() => lever.classList.remove('nope'), 450);
        return;
      }
      on = val;
      lab.classList.toggle('lit', on);
      lever.classList.toggle('up', on);
      if (on) {
        say('3/3', 'TinkerSpace is lit! See you on Dec 19 & 20');
        const r = svg.getBoundingClientRect();
        setTimeout(() => pop(r.left + r.width * .62, r.top + r.height * .35), 500);
      } else say('3/3', 'Lights off. Flip it again!');
      hint();
    };
    const reset = () => {
      links.forEach(L => { setD(L.wire, null); L.wire.classList.remove('made', 'fresh'); });
      done = 0; on = false; picked = null; lab.classList.remove('lit'); lever.classList.remove('up');
      say('1/3', 'Drag a wire from the battery’s + to the switch');
      hint();
    };

    // pointer position in viewBox units
    const local = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
    const live = T('wlive');
    const ends = () => done < links.length ? [links[done].a, links[done].b] : [];

    svg.addEventListener('pointerdown', e => {
      const t = e.target.closest('.term');
      if (!t || busy) return;
      const [a, b] = ends();
      if (t.id !== a && t.id !== b) return;
      e.preventDefault();
      drag = { from: t.id, to: t.id === a ? b : a, moved: false };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      drag.moved = true;
      setD(live, sag(pt(drag.from), local(e)));
      live.classList.add('show');
    });
    svg.addEventListener('pointerup', e => {
      if (!drag) return;
      const m = local(e), q = pt(drag.to);
      live.classList.remove('show');
      if (!drag.moved) {
        // tap mode: tap one end, then the other
        if (picked && picked === drag.to) { picked = null; connect(); }
        else { picked = drag.from; say(done + 1 + '/3', 'Good, now tap the other glowing end'); }
      } else if (Math.hypot(m.x - q.x, m.y - q.y) < 55) { picked = null; connect(); }
      drag = null;
    });
    T('switch').addEventListener('click', () => { if (!busy) setOn(!on); });
    T('switch').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOn(!on); } });

    lab.querySelector('[data-auto]').addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      if (on) setOn(false);
      const wait = ms => new Promise(r => setTimeout(r, calm.matches ? 0 : ms));
      while (done < links.length) { await wait(450); connect(); }
      await wait(650); setOn(true);
      busy = false;
    });
    lab.querySelector('[data-reset]').addEventListener('click', () => { if (!busy) reset(); });
    reset();
  }

  /* ---------------- Print your ticket ---------------- */
  const form = document.querySelector('.tix-form');
  if (form) {
    const canvas = document.querySelector('.ticket');
    const out = document.querySelector('.tix-out');
    const after = document.querySelector('.tix-after');
    const machine = document.querySelector('.machine');
    let ctx = canvas.getContext('2d');
    const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const assets = Promise.all([load('assets/carnival/texture.jpg'), load('assets/carnival/wordmark.svg'), load('assets/carnival/frog.webp')]);
    const fonts = Promise.all(['400 80px "Homemade Apple"', '800 40px Poppins', '700 30px Poppins', '600 30px Poppins']
      .map(f => document.fonts.load(f))).catch(() => {});

    const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
    const fit = (text, font, size, max) => { do { ctx.font = font.replace('#', size); size -= 2; } while (ctx.measureText(text).width > max && size > 20); };
    const number = name => String([...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7) + 1).padStart(4, '0');

    // bg = true draws the violet crayon backdrop (for the downloaded / shared image);
    // on the page the ticket prints on its own, as paper
    async function draw(cv, name, events, bg) {
      const [tex, mark, frog] = await assets; await fonts;
      ctx = cv.getContext('2d');
      const W = 1080, H = 1350; cv.width = W; cv.height = H;
      ctx.clearRect(0, 0, W, H);
      if (bg) {
        ctx.fillStyle = '#5c0fdb'; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'overlay';
        const s = Math.max(W / tex.width, H / tex.height);
        ctx.drawImage(tex, (W - tex.width * s) / 2, (H - tex.height * s) / 2, tex.width * s, tex.height * s);
        ctx.globalCompositeOperation = 'source-over';
      }

      // ticket body with side notches at the tear line
      const X = 110, Y = 120, TW = 860, TH = 1110, tear = 1030;
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.rotate(-1.5 * Math.PI / 180); ctx.translate(-W / 2, -H / 2);
      ctx.fillStyle = '#000'; rr(X + 10, Y + 16, TW, TH, 36); ctx.fill();
      ctx.beginPath(); ctx.roundRect(X, Y, TW, TH, 36);
      ctx.moveTo(X + 34, tear); ctx.arc(X, tear, 34, 0, Math.PI * 2);
      ctx.moveTo(X + TW + 34, tear); ctx.arc(X + TW, tear, 34, 0, Math.PI * 2);
      ctx.fillStyle = '#fefce3'; ctx.fill('evenodd');
      ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.stroke();

      // header band with the wordmark
      ctx.fillStyle = '#5c0fdb'; rr(X + 40, Y + 40, TW - 80, 330, 24); ctx.fill();
      ctx.save(); rr(X + 40, Y + 40, TW - 80, 330, 24); ctx.clip();
      ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(tex, X, Y, 900, 675); ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
      const mw = 470, mh = mw * 695 / 1350;
      ctx.drawImage(mark, X + 320, Y + 80, mw, mh);
      ctx.save(); ctx.translate(X + 175, Y + 230); ctx.rotate(-12 * Math.PI / 180); ctx.drawImage(frog, -110, -143, 220, 286); ctx.restore();

      ctx.fillStyle = '#000'; ctx.textAlign = 'center';
      ctx.font = '800 40px Poppins'; ctx.letterSpacing = '10px';
      ctx.fillText('ADMIT ONE', W / 2 + 5, Y + 440);
      ctx.letterSpacing = '0px';

      const who = name.trim() || 'A Tinkerer';
      fit(who, '400 #px "Homemade Apple"', 92, TW - 140);
      ctx.save(); ctx.translate(W / 2, Y + 565); ctx.rotate(-3 * Math.PI / 180); ctx.fillStyle = '#5c0fdb'; ctx.fillText(who, 0, 0); ctx.restore();

      // events
      ctx.textAlign = 'left';
      const list = events.length ? events : [['Carnival weekend', 'Dec 19 & 20']];
      const lh = list.length > 4 ? 52 : 62, top = Y + 680 - (list.length > 4 ? 10 : 0);
      list.forEach(([title, when], i) => {
        const y = top + i * lh;
        ctx.fillStyle = ['#fde900', '#ff4fb8', '#22c55e', '#38bdf8', '#ff7a1a', '#5c0fdb'][i % 6];
        ctx.beginPath(); ctx.arc(X + 88, y - 11, 13, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = '#000'; ctx.font = '700 33px Poppins'; ctx.fillText(title, X + 120, y);
        ctx.font = '600 28px Poppins'; ctx.textAlign = 'right'; ctx.fillText(when, X + TW - 70, y); ctx.textAlign = 'left';
      });

      // tear line and stub
      ctx.setLineDash([16, 14]); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X + 50, tear); ctx.lineTo(X + TW - 50, tear); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '800 34px Poppins'; ctx.fillText('DEC 19 & 20 · TINKERSPACE KOCHI', X + 70, tear + 76);
      ctx.font = '600 24px Poppins'; ctx.fillStyle = '#444'; ctx.fillText('TinkerSpace turns four', X + 70, tear + 120);
      ctx.fillStyle = '#000'; ctx.font = '800 30px Poppins'; ctx.textAlign = 'right'; ctx.fillText('No. ' + number(who), X + TW - 70, tear + 76);
      // little barcode
      let bx = X + TW - 300; const seed = number(who);
      for (let i = 0; i < 46; i++) { const w = 2 + (seed.charCodeAt(i % 4) + i * 7) % 5; ctx.fillRect(bx, tear + 128, w, 38); bx += w + 3; if (bx > X + TW - 70) break; }
      ctx.restore();
    }

    let current = null;
    // the keepsake image: same ticket on the violet crayon backdrop, Instagram-post sized
    const keepsake = async () => { const c = document.createElement('canvas'); await draw(c, ...current, true); return new Promise(r => c.toBlob(r, 'image/png')); };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      current = [form.elements.name.value, [...form.querySelectorAll('input[name=ev]:checked')].map(i => [i.value, i.dataset.when])];
      out.classList.remove('printed', 'done'); after.hidden = true; machine.classList.add('working');
      await draw(canvas, ...current, false);
      void out.offsetWidth; // restart the print animation
      out.classList.add('printed');
      setTimeout(() => {
        machine.classList.remove('working'); out.classList.add('done'); after.hidden = false;
        const r = out.getBoundingClientRect(); pop(r.left + r.width / 2, r.top + 40);
      }, calm.matches ? 0 : 2300);
    });

    after.querySelector('[data-download]').addEventListener('click', async () => {
      const b = await keepsake();
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'space-carnival-ticket.png'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    const share = after.querySelector('[data-share]');
    share.hidden = !(navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }));
    share.addEventListener('click', async () => {
      const b = await keepsake();
      try { await navigator.share({ files: [new File([b], 'space-carnival-ticket.png', { type: 'image/png' })], text: 'See you at Space Carnival, Dec 19 & 20 at TinkerSpace Kochi!' }); } catch (_) {}
    });
  }
})();
