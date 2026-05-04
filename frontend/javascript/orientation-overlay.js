(function () {
    // Az overlay elem fix azonosítója, ezt keressük a DOM-ban.
    const overlayAzonosito = 'portraitLockOverlay';

    function mobilNezetE() {
        // Mobilnak vesszük az érintős vagy kis kijelzős nézeteket is.
        const touchEszkoz = window.matchMedia('(hover: none) and (pointer: coarse)').matches || navigator.maxTouchPoints > 1;
        const extraKeskeny = window.innerWidth <= 640 && window.innerHeight <= 960;
        return touchEszkoz || extraKeskeny;
    }

    function portraitAllapotFrissites() {
        const overlayElem = document.getElementById(overlayAzonosito);
        if (!overlayElem) {
            return;
        }

        // Overlay csak mobil + portrait esetén látszódjon.
        const portraitNezet = window.matchMedia('(orientation: portrait)').matches;
        const overlayLatszik = portraitNezet && mobilNezetE();

        document.body.classList.toggle('portrait-lock-active', overlayLatszik);
        overlayElem.setAttribute('aria-hidden', overlayLatszik ? 'false' : 'true');
    }

    function portraitFigyelesInditasa() {
        const orientationMedia = window.matchMedia('(orientation: portrait)');

        // Kezdeti állapot + változásfigyelők bekötése.
        portraitAllapotFrissites();
        window.addEventListener('resize', portraitAllapotFrissites);
        window.addEventListener('orientationchange', portraitAllapotFrissites);

        // Régebbi böngészőknél fallback az addListener API-ra.
        if (typeof orientationMedia.addEventListener === 'function') {
            orientationMedia.addEventListener('change', portraitAllapotFrissites);
        } else if (typeof orientationMedia.addListener === 'function') {
            orientationMedia.addListener(portraitAllapotFrissites);
        }
    }

    document.addEventListener('DOMContentLoaded', portraitFigyelesInditasa);
})();
