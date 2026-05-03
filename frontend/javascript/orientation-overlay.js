(function () {
    const overlayAzonosito = 'portraitLockOverlay';

    function mobilNezetE() {
        const touchEszkoz = window.matchMedia('(hover: none) and (pointer: coarse)').matches || navigator.maxTouchPoints > 1;
        const extraKeskeny = window.innerWidth <= 640 && window.innerHeight <= 960;
        return touchEszkoz || extraKeskeny;
    }

    function portraitAllapotFrissites() {
        const overlayElem = document.getElementById(overlayAzonosito);
        if (!overlayElem) {
            return;
        }

        const portraitNezet = window.matchMedia('(orientation: portrait)').matches;
        const overlayLatszik = portraitNezet && mobilNezetE();

        document.body.classList.toggle('portrait-lock-active', overlayLatszik);
        overlayElem.setAttribute('aria-hidden', overlayLatszik ? 'false' : 'true');
    }

    function portraitFigyelesInditasa() {
        const orientationMedia = window.matchMedia('(orientation: portrait)');

        portraitAllapotFrissites();
        window.addEventListener('resize', portraitAllapotFrissites);
        window.addEventListener('orientationchange', portraitAllapotFrissites);

        if (typeof orientationMedia.addEventListener === 'function') {
            orientationMedia.addEventListener('change', portraitAllapotFrissites);
        } else if (typeof orientationMedia.addListener === 'function') {
            orientationMedia.addListener(portraitAllapotFrissites);
        }
    }

    document.addEventListener('DOMContentLoaded', portraitFigyelesInditasa);
})();
