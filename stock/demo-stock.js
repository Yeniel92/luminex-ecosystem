(function() {
  const screens = ['demo-s1', 'demo-s2', 'demo-s3', 'demo-s4'];
  const dots = ['demo-d0', 'demo-d1', 'demo-d2', 'demo-d3'];
  const labels = [
    'Revisando el <strong>dashboard</strong> de inventario...',
    'Listado de productos — alerta de <strong>stock bajo</strong>',
    'Registrando <strong>entrada de stock</strong> — Harina 000',
    'Generando <strong>reporte de inventario</strong>...'
  ];

  function showScreen(idx) {
    screens.forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active', 'exit');
      if (i === idx) el.classList.add('active');
      else if (i === idx - 1) el.classList.add('exit');
    });
    dots.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', i === idx);
    });
    const labelEl = document.getElementById('demo-step-label');
    if (labelEl) labelEl.innerHTML = labels[idx];
  }

  function animateDash() {
    return new Promise(resolve => {
      const targets = { 'demo-d-total': 8, 'demo-d-mov': 7, 'demo-d-low': 2, 'demo-d-out': 1 };
      let done = 0;
      Object.entries(targets).forEach(([id, val], i) => {
        setTimeout(() => {
          let v = 0;
          const el = document.getElementById(id);
          if (!el) return;
          const t = setInterval(() => {
            v = Math.min(v + 1, val);
            el.textContent = v;
            if (v >= val) {
              clearInterval(t);
              done++;
              if (done === 4) {
                setTimeout(() => {
                  const a1 = document.getElementById('demo-alert1');
                  if (a1) a1.classList.add('visible');
                  setTimeout(() => {
                    const a2 = document.getElementById('demo-alert2');
                    if (a2) a2.classList.add('visible');
                    resolve();
                  }, 500);
                }, 400);
              }
            }
          }, 60);
        }, i * 150);
      });
    });
  }

  function animateMov() {
    return new Promise(resolve => {
      const cantDisplay = document.getElementById('demo-mov-cant-display');
      const movQty = document.getElementById('demo-mov-qty');
      const btnMov = document.getElementById('demo-btn-mov');
      if (!cantDisplay || !movQty || !btnMov) return resolve();

      setTimeout(() => { cantDisplay.textContent = '20 kg'; }, 600);
      setTimeout(() => { movQty.classList.add('visible'); }, 900);
      setTimeout(() => { btnMov.classList.add('visible'); }, 1200);
      setTimeout(() => {
        btnMov.style.transform = 'scale(.96)';
        setTimeout(() => { btnMov.style.transform = ''; }, 150);
      }, 2000);
      setTimeout(resolve, 2600);
    });
  }

  function animateReport() {
    const targets = { 'demo-rp-prod': 8, 'demo-rp-mov': 48, 'demo-rp-low': 2, 'demo-rp-out': 1 };
    Object.entries(targets).forEach(([id, val], i) => {
      setTimeout(() => {
        let v = 0;
        const el = document.getElementById(id);
        if (!el) return;
        const t = setInterval(() => {
          v = Math.min(v + Math.ceil(val / 15), val);
          el.textContent = v;
          if (v >= val) clearInterval(t);
        }, 40);
      }, i * 100);
    });
    const barWidths = [100, 75, 62, 33];
    barWidths.forEach((w, i) => {
      const el = document.getElementById('demo-rb' + (i + 1));
      if (el) {
        setTimeout(() => { el.style.width = w + '%'; }, 400 + i * 150);
      }
    });
  }

  async function runSequence() {
    // Reset
    const a1 = document.getElementById('demo-alert1'); if (a1) a1.classList.remove('visible');
    const a2 = document.getElementById('demo-alert2'); if (a2) a2.classList.remove('visible');
    const mq = document.getElementById('demo-mov-qty'); if (mq) mq.classList.remove('visible');
    const bm = document.getElementById('demo-btn-mov'); if (bm) bm.classList.remove('visible');
    const cd = document.getElementById('demo-mov-cant-display'); if (cd) cd.textContent = '—';
    
    ['demo-d-total', 'demo-d-mov', 'demo-d-low', 'demo-d-out'].forEach(id => {
      const el = document.getElementById(id); if (el) el.textContent = '0';
    });
    ['demo-rp-prod', 'demo-rp-mov', 'demo-rp-low', 'demo-rp-out'].forEach(id => {
      const el = document.getElementById(id); if (el) el.textContent = '0';
    });
    ['demo-rb1', 'demo-rb2', 'demo-rb3', 'demo-rb4'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.width = '0%';
    });

    showScreen(0);
    await animateDash();
    await new Promise(r => setTimeout(r, 1200));

    showScreen(1);
    await new Promise(r => setTimeout(r, 3000));

    showScreen(2);
    await animateMov();
    await new Promise(r => setTimeout(r, 400));

    showScreen(3);
    setTimeout(animateReport, 400);
    await new Promise(r => setTimeout(r, 3500));

    await new Promise(r => setTimeout(r, 800));
    runSequence();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runSequence);
  } else {
    runSequence();
  }
})();
