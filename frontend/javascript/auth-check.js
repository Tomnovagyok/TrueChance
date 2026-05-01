//! Bejelentkezés ellenőrzés - védett oldalakon fut le
//?  Ezt a scriptet minden olyan HTML oldalba bele kell tenni, ahol csak bejelentkezett felhasználó járhat
//?  (games.html, slot.html, roulette.html, blackjack.html, poker.html, daily-cash.html, statisztikaim.html, ranglista.html, profil.html, admin.html)
//?
//?  Hogyan működik:
//?  1. A script azonnal lekérdezi a /api/auth/me végpontot
//?  2. Ha a szerver 200-as választ küld (bejelentkezve) → az oldal normálisan betölt
//?  3. Ha a szerver 401-es választ küld (nincs bejelentkezve) → átirányítás az auth.html-re
//?
//?  Miért kell ez, ha a szerver már ellenőrzi?
//?  Plusz biztonság: a szerver oldali redirect a .html fájlokra vonatkozik,
//?  de ha valaki cache-ből nyitja meg az oldalt, ez a script még lefut és kiveti.

(function () {
    //?  Azonnal lefutó függvény (IIFE) - nem szennyezi a globális változókat

    fetch('/api/auth/me')
        .then(function (valasz) {
            if (!valasz.ok) {
                //?  Nincs bejelentkezve → auth.html-re küldjük
                //?  replace() helyett href = nincs "Vissza" gomb a böngészőben (nem térhet vissza a védett oldalra)
                window.location.replace('/html/auth.html');
                return;
            }

            //?  Ha be van jelentkezve, lekérjük az adatait és kiírjuk a navbar-ba a nevét
            return valasz.json();
        })
        .then(function (felhasznalo) {
            if (!felhasznalo) return;

            //?  Ha van profilNev elem a navbar-ban, kiírjuk a felhasználó nevét
            const profilNev = document.querySelector('.profil-nev');
            if (profilNev) {
                profilNev.textContent = felhasznalo.nev;
            }

            //?  Ha van navbar egyenleg elem, frissítjük az adatbázisból jövő értékkel
            const navbarEgyenleg = document.getElementById('navbarEgyenleg');
            if (navbarEgyenleg) {
                navbarEgyenleg.textContent = '$' + felhasznalo.egyenleg;
            }

            //?  Ha van egyenleg kijelző a játékoldalon, frissítjük az adatbázisból jövő értékkel
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

            if (window.location.pathname === '/html/admin.html' && !felhasznalo.adminE) {
                window.location.replace('/html/games.html');
            }
        })
        .catch(function () {
            //?  Ha a szerver nem válaszol (pl. le van állítva) → auth.html-re küldjük
            window.location.replace('/html/auth.html');
        });

    //! Kilépés gomb kezelése
    //?  DOMContentLoaded-re várunk, mert a DOM még nem feltétlenül töltődött be ide érve
    document.addEventListener('DOMContentLoaded', function () {
        //?  Megkeressük a kilépés linket - minden védett oldalon ugyanaz az id
        const kilepesLink = document.getElementById('kilepesLink');

        if (kilepesLink) {
            kilepesLink.addEventListener('click', function (event) {
                event.preventDefault(); //?  Megakadályozzuk az alapértelmezett link navigációt

                //?  Kijelentkezés API hívás
                fetch('/api/auth/logout', { method: 'POST' })
                    .then(function () {
                        //?  Sikeres kijelentkezés után a főoldalra küldjük
                        window.location.href = '/html/index.html';
                    })
                    .catch(function () {
                        //?  Ha valami hiba van, akkor is a főoldalra küldjük
                        window.location.href = '/html/index.html';
                    });
            });
        }
    });
})();
