/**
 * Luminex Ecosystem - PWA Install Handler
 * Este script gestiona el prompt de instalación y la guía para el usuario.
 */

let deferredPrompt;
const installButtons = document.querySelectorAll('a[href*="sales/app"], a[href*="stock/app"], a[href="/sales/"], .btn-install-pwa');

// 1. Capturar el evento de instalación (navegadores compatibles)
window.addEventListener('beforeinstallprompt', (e) => {
    // Evitar que el navegador muestre el prompt automáticamente
    e.preventDefault();
    // Guardar el evento para dispararlo luego
    deferredPrompt = e;
    console.log('PWA: Evento beforeinstallprompt capturado');
});

// 2. Escuchar cuando la app se instala con éxito
window.addEventListener('appinstalled', (evt) => {
    console.log('PWA: Aplicación instalada con éxito');
    deferredPrompt = null;
});

// 3. Función principal de instalación
async function handleInstall(event, targetUrl) {
    // Si tenemos el prompt guardado, lo disparamos
    if (deferredPrompt) {
        event.preventDefault();
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA: El usuario eligió ${outcome}`);
        deferredPrompt = null;
    } else {
        // Si no hay prompt (iOS o ya instalado o no compatible)
        // Verificamos si ya está en modo "standalone" (instalada)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        
        if (isStandalone) {
            // Si ya está instalada, simplemente vamos a la app
            window.location.href = targetUrl;
        } else {
            // Si no está instalada y no hay prompt, mostramos la guía
            event.preventDefault();
            showInstallGuide(targetUrl);
        }
    }
}

// 4. Mostrar guía de instalación (Modal simple)
function showInstallGuide(targetUrl) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    const modalHtml = `
        <div id="pwa-guide-modal" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; font-family:sans-serif; backdrop-filter:blur(5px);">
            <div style="background:#15261f; border:1px solid #c9a84c; border-radius:20px; padding:30px; max-width:400px; width:100%; text-align:center; color:white; box-shadow:0 20px 50px rgba(0,0,0,0.5);">
                <div style="font-size:40px; margin-bottom:15px;">📱</div>
                <h3 style="font-family:Syne, sans-serif; font-size:22px; margin-bottom:15px; color:#c9a84c;">Instalar Aplicación</h3>
                <p style="font-size:15px; line-height:1.5; margin-bottom:25px; color:#94a3b8;">
                    ${isIOS 
                        ? 'Para usar la app, pulsa el botón <strong>Compartir</strong> <img src="https://img.icons8.com/ios/24/ffffff/export.png" style="height:18px; vertical-align:middle;"> y luego selecciona <strong>"Añadir a pantalla de inicio"</strong>.' 
                        : 'Para una mejor experiencia, instala la app desde el menú de tu navegador (los tres puntos <img src="https://img.icons8.com/ios-glyphs/24/ffffff/ellipsis.png" style="height:18px; vertical-align:middle;">) y selecciona <strong>"Instalar aplicación"</strong>.'}
                </p>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button onclick="document.getElementById('pwa-guide-modal').remove(); window.location.href='${targetUrl}'" style="background:#c9a84c; color:#0b1a14; border:none; padding:12px; border-radius:10px; font-weight:bold; cursor:pointer;">Continuar en el navegador</button>
                    <button onclick="document.getElementById('pwa-guide-modal').remove()" style="background:transparent; color:#94a3b8; border:1px solid #334155; padding:12px; border-radius:10px; cursor:pointer;">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 5. Vincular eventos a los botones mediante delegación para mayor robustez
document.addEventListener('click', (e) => {
    const btn = e.target.closest('a');
    if (!btn) return;
    
    const url = btn.getAttribute('href');
    if (!url) return;

    // Solo interceptamos si parece una URL de app o contiene "Probar gratis"
    const isAppUrl = url.includes('/app') || url === '/sales/' || url.includes('stock/app');
    const isFreeTrialBtn = btn.textContent.toLowerCase().includes('probar gratis');

    if (isAppUrl || isFreeTrialBtn) {
        console.log('PWA: Interceptando clic en botón de instalación:', url);
        handleInstall(e, url);
    }
});
