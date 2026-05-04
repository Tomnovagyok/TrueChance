// Azonnali függvény (IIFE), amely oldalbetöltéskor lefut.
// Ellenőrzi a /api/auth/me végponton, hogy a felhasználó be van-e jelentkezve.
(function () {
    const Fetch = async (url, method = 'GET', body = null) => {
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-type': 'application/json' },
                body: body ? JSON.stringify(body) : null
            });

            if (!response.ok) {
                throw new Error('Hiba: ' + response.statusText);
            }

            return await response.json();
        } catch (error) {
            throw new Error('Hiba: ' + error.message);
        }
    };

    function frissitFelhasznaloAdatokat(felhasznalo) {
        const profilNev = document.querySelector('.profil-nev');
        if (profilNev) {
            profilNev.textContent = felhasznalo.nev;
        }

        const navbarEgyenleg = document.getElementById('navbarEgyenleg');
        if (navbarEgyenleg) {
            navbarEgyenleg.textContent = '$' + felhasznalo.egyenleg;
        }

        const egyenlegElem = document.getElementById('infoPanelEgyenleg');
        if (egyenlegElem) {
            egyenlegElem.innerHTML = '$' + felhasznalo.egyenleg;
        }

        const adminMenuPontok = document.querySelectorAll('.admin-menu-pont');
        for (let i = 0; i < adminMenuPontok.length; i++) {
            const adminLink = adminMenuPontok[i].querySelector('a');
            if (adminLink) {
                adminLink.setAttribute('href', 'admin.html');
            }

            if (felhasznalo.adminE) {
                adminMenuPontok[i].classList.remove('d-none');
            } else {
                adminMenuPontok[i].classList.add('d-none');
            }
        }
    }

    async function felhasznaloEllenorzes() {
        try {
            const felhasznalo = await Fetch('/api/auth/me');
            if (!felhasznalo) {
                window.location.replace('/html/auth.html');
                return;
            }

            frissitFelhasznaloAdatokat(felhasznalo);

            // Ha az admin panelen van, de nincs admin joga, visszadobja a játékokhoz
            if (window.location.pathname === '/html/admin.html' && !felhasznalo.adminE) {
                window.location.replace('/html/games.html');
            }
        } catch (error) {
            // Hiba esetén (pl. nincs szerverkapcsolat) is irányítsuk át a bejelentkezésre
            window.location.replace('/html/auth.html');
        }
    }

    function kilepesKezelesBeallitasa() {
        const kilepesLink = document.getElementById('kilepesLink');
        if (!kilepesLink) {
            return;
        }

        kilepesLink.addEventListener('click', async function (event) {
            event.preventDefault();

            try {
                await Fetch('/api/auth/logout', 'POST', {});
            } catch (error) {
                // Kilépés után mindenképp visszairányítás a főoldalra.
            } finally {
                window.location.href = '/html/index.html';
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        kilepesKezelesBeallitasa();
    });

    felhasznaloEllenorzes();
})();
