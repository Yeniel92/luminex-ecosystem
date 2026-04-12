// =============================================
// LUMINEX ECOSYSTEM — Componentes UI Compartidos
// =============================================

const LuminexUI = {

  // Navbar compartido del ecosistema
  renderNavbar(appActiva) {
    const links = [
      { href: '/', label: 'Inicio' },
      { href: '/sales/', label: 'Sales', id: 'sales' },
      { href: '/stock/', label: 'Stock', id: 'stock' }
    ];
    return `
      <nav class="luminex-navbar">
        <a href="/" class="luminex-logo">
          <img src="/logo-luminex.png" alt="Luminex" height="32">
          <span>Luminex ECOSYSTEM</span>
        </a>
        <ul>
          ${links.map(l => `
            <li>
              <a href="${l.href}" 
                 class="${l.id === appActiva ? 'active' : ''}">
                ${l.label}
              </a>
            </li>
          `).join('')}
        </ul>
      </nav>
    `;
  },

  // Footer compartido
  renderFooter() {
    return `
      <footer class="luminex-footer">
        <a href="/">Luminex ECOSYSTEM</a>
        <span>© 2026 · Uruguay</span>
      </footer>
    `;
  },

  // Toast de notificación compartido
  toast(mensaje, tipo = 'info') {
    const colores = {
      success: '#22c55e',
      error: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b'
    };
    const div = document.createElement('div');
    div.style.cssText = `
      position:fixed; bottom:20px; right:20px;
      background:${colores[tipo]}; color:white;
      padding:12px 20px; border-radius:8px;
      font-size:14px; z-index:9999;
      box-shadow:0 4px 12px rgba(0,0,0,0.2);
    `;
    div.textContent = mensaje;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  },

  // Indicador de conexión Supabase
  mostrarEstadoConexion(conectado) {
    const el = document.getElementById('luminex-conexion');
    if (!el) return;
    el.textContent = conectado ? '🔗 En línea' : '📴 Sin conexión';
    el.style.color = conectado ? '#22c55e' : '#ef4444';
  }
};
