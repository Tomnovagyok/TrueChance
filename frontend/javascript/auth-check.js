// Azonnali függvény (IIFE), amely oldalbetöltéskor lefut.
// Ellenőrzi a /api/auth/me végponton, hogy a felhasználó be van-e jelentkezve.
(function () {
    fetch('/api/auth/me')
        .then(function (valasz) {
            if (!valasz.ok) {
                window.location.replace('/html/auth.html');
                return;
            }

            return valasz.json();
        })
        .then(function (felhasznalo) {
            if (!felhasznalo) return;

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

            // Ha az admin panelen van, de nincs admin joga, visszadobja a játékokhoz
            if (window.location.pathname === '/html/admin.html' && !felhasznalo.adminE) {
                window.location.replace('/html/games.html');
            }
        })
        .catch(function () {
            // Hiba esetén (pl. nincs szerverkapcsolat) is irányítsuk át a bejelentkezésre
            window.location.replace('/html/auth.html');
        });

    document.addEventListener('DOMContentLoaded', function () {
        const kilepesLink = document.getElementById('kilepesLink');

        if (kilepesLink) {
            kilepesLink.addEventListener('click', function (event) {
                event.preventDefault();

                fetch('/api/auth/logout', { method: 'POST' })
                    .then(function () {
                        window.location.href = '/html/index.html';
                    })
                    .catch(function () {
                        window.location.href = '/html/index.html';
                    });
            });
        }
    });
})();
