(function() {
  const screens = ['demo-s1', 'demo-s2', 'demo-s3', 'demo-s4'];
  const dots = ['demo-d0', 'demo-d1', 'demo-d2', 'demo-d3'];
  const labels = [
    'Seleccionando productos para la venta...',
    '<strong>¡Venta registrada!</strong> — $225 cobrados',
    'Revisando el <strong>historial de ventas</strong> del día...',
    'Consultando <strong>reportes</strong> y estadísticas...'
  ];

  let current = 0;

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

  function runStep1() {
    return new Promise(resolve => {
      const items = [
        { id: 'demo-p1', name: '☕ Café', price: 85 },
        { id: 'demo-p2', name: '🥐 Medialuna', price: 45 },
        { id: 'demo-p3', name: '🥤 Jugo', price: 95 },
      ];
      let total = 0;
      let step = 0;
      const cartEl = document.getElementById('demo-cart-items');
      const totalEl = document.getElementById('demo-cart-total');
      const btnCobrar = document.getElementById('demo-btn-cobrar');
      if (!cartEl || !totalEl || !btnCobrar) return resolve();
      
      cartEl.innerHTML = '';

      function addItem() {
        if (step >= items.length) {
          btnCobrar.classList.add('visible');
          setTimeout(() => {
            btnCobrar.classList.remove('visible');
            resolve();
          }, 1400);
          return;
        }
        const item = items[step];
        const card = document.getElementById(item.id);
        if (card) {
          card.classList.add('adding', 'selected');
          setTimeout(() => card.classList.remove('adding'), 300);
        }

        total += item.price;
        totalEl.textContent = '$' + total;

        const div = document.createElement('div');
        div.className = 'demo-cart-item';
        div.innerHTML = `<span class="demo-cart-item-name"><span class="demo-cart-item-qty">x1</span>${item.name}</span><span style="color:#c9a84c;font-weight:700;font-size:10px">$${item.price}</span>`;
        cartEl.appendChild(div);
        setTimeout(() => div.classList.add('visible'), 50);

        step++;
        setTimeout(addItem, 900);
      }
      setTimeout(addItem, 600);
    });
  }

  function animateReports() {
    const targets = {
      'demo-r-ventas': { val: 4, prefix: '', suffix: '' },
      'demo-r-total': { val: 730, prefix: '$', suffix: '' },
      'demo-r-prod': { val: 12, prefix: '', suffix: '' },
      'demo-r-prom': { val: 182, prefix: '$', suffix: '' },
    };
    const barHeights = [45, 60, 35, 70, 55, 80, 100];

    Object.entries(targets).forEach(([id, cfg]) => {
      let start = 0;
      const el = document.getElementById(id);
      if (!el) return;
      const inc = Math.ceil(cfg.val / 20);
      const timer = setInterval(() => {
        start = Math.min(start + inc, cfg.val);
        el.textContent = cfg.prefix + start + cfg.suffix;
        if (start >= cfg.val) clearInterval(timer);
      }, 40);
    });

    barHeights.forEach((h, i) => {
      const el = document.getElementById('demo-b' + (i + 1));
      if (el) {
        setTimeout(() => {
          el.style.height = h + '%';
        }, i * 80);
      }
    });
  }

  async function runSequence() {
    // Reset
    document.querySelectorAll('.demo-prod-card').forEach(c => c.classList.remove('selected'));
    const cartItems = document.getElementById('demo-cart-items');
    if (cartItems) cartItems.innerHTML = '';
    const cartTotal = document.getElementById('demo-cart-total');
    if (cartTotal) cartTotal.textContent = '$0';
    const btnCobrar = document.getElementById('demo-btn-cobrar');
    if (btnCobrar) btnCobrar.classList.remove('visible');

    showScreen(0);
    await runStep1();
    await new Promise(r => setTimeout(r, 200));

    showScreen(1);
    await new Promise(r => setTimeout(r, 2800));

    showScreen(2);
    await new Promise(r => setTimeout(r, 2500));

    showScreen(3);
    setTimeout(animateReports, 400);
    await new Promise(r => setTimeout(r, 3500));

    // Loop
    await new Promise(r => setTimeout(r, 1000));
    runSequence();
  }

  // Iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runSequence);
  } else {
    runSequence();
  }
})();
