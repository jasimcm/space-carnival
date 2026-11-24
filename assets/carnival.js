/* Space Carnival landing page toy: Print your ticket, a carnival ticket drawn on canvas, downloadable as a PNG. */
(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const pop = (x, y, o) => { if (typeof burst === 'function' && !calm.matches) burst(x, y, o); else window.sfx?.pop(); };
  const sfx = new Proxy({}, { get: (_, k) => (...a) => window.sfx?.[k]?.(...a) });

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
      sfx.press();
      await draw(canvas, ...current, false);
      void out.offsetWidth; // restart the print animation
      out.classList.add('printed');
      if (!calm.matches) sfx.print(2.2, 11);
      setTimeout(() => {
        machine.classList.remove('working'); out.classList.add('done'); after.hidden = false;
        sfx.ding();
        const r = out.getBoundingClientRect(); pop(r.left + r.width / 2, r.top + 40, { count: 80 });
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
