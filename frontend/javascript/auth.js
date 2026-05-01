document.addEventListener('DOMContentLoaded', function () {
    const bejelentkezesBtn = document.getElementById('showLoginBtn');
    const regisztracioBtn = document.getElementById('showRegisterBtn');
    const bejelentkezesForm = document.getElementById('loginForm');
    const regisztracioForm = document.getElementById('registerForm');

    //! Tab váltás (bejelentkezés / regisztráció)
    bejelentkezesBtn.addEventListener('click', function () {
        bejelentkezesBtn.classList.add('active');
        bejelentkezesForm.style.display = 'block';

        regisztracioBtn.classList.remove('active');
        regisztracioForm.style.display = 'none';

        hibaTorles(); //?  Tab váltáskor töröljük a hibaüzenetet
    });

    regisztracioBtn.addEventListener('click', function () {
        regisztracioBtn.classList.add('active');
        regisztracioForm.style.display = 'block';

        bejelentkezesBtn.classList.remove('active');
        bejelentkezesForm.style.display = 'none';

        hibaTorles();
    });

    //! Bejelentkezés
    bejelentkezesForm.querySelector('form').addEventListener('submit', async function (event) {
        event.preventDefault(); //?  Megakadályozza az oldalfrissítést

        const email = document.getElementById('loginEmail').value;
        const jelszo = document.getElementById('loginPassword').value;

        //?  fetch() = HTTP kérés küldése a backendnek, async/await-tel várjuk meg a választ
        try {
            const valasz = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, jelszo: jelszo })
                //?  JSON.stringify() = objektumból stringet csinál, hogy el lehessen küldeni
            });

            const adat = await valasz.json(); //?  A szerver válaszát JSON-ból objektummá alakítja

            if (valasz.ok) {
                //?  Sikeres bejelentkezés → átirányítás a játékválasztóra
                window.location.href = 'games.html';
            } else {
                //?  Hiba esetén alert() helyett inline hibaüzenetet mutatunk
                hibaMutat(adat.uzenet);
            }
        } catch (hiba) {
            //?  Ha a szerver nem válaszol (pl. le van állítva)
            hibaMutat('Nem sikerült kapcsolódni a szerverhez. Elindítottad a backendet?');
        }
    });

    //! Regisztráció
    regisztracioForm.querySelector('form').addEventListener('submit', async function (event) {
        event.preventDefault();

        const nev = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const jelszo = document.getElementById('regPassword').value;
        const jelszoIsmet = document.getElementById('regPasswordConfirm').value;

        if (jelszo !== jelszoIsmet) {
            hibaMutat('A két jelszó nem egyezik meg!');
            return;
        }

        try {
            const valasz = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nev: nev, email: email, jelszo: jelszo })
            });

            const adat = await valasz.json();

            if (valasz.ok) {
                window.location.href = 'games.html';
            } else {
                hibaMutat(adat.uzenet);
            }
        } catch (hiba) {
            hibaMutat('Nem sikerült kapcsolódni a szerverhez. Elindítottad a backendet?');
        }
    });

    //! Hibaüzenet megjelenítése / törlése
    function hibaMutat(szoveg) {
        //?  Megkeressük a hibaüzenet dobozt az oldalon
        let hibaElem = document.getElementById('hibaUzenet');

        //?  Ha még nem létezik, létrehozzuk és beillesztjük a form elé
        if (!hibaElem) {
            hibaElem = document.createElement('div');
            hibaElem.id = 'hibaUzenet';
            hibaElem.classList.add('hiba-uzenet');

            //?  A bejelentkezés/regisztráció kártya tetejére szúrjuk be
            const kartya = document.querySelector('.bejelentkezes-kartya');
            kartya.insertBefore(hibaElem, kartya.firstChild);
        }

        hibaElem.textContent = szoveg;
        hibaElem.style.display = 'block';
    }

    function hibaTorles() {
        const hibaElem = document.getElementById('hibaUzenet');
        if (hibaElem) {
            hibaElem.style.display = 'none';
        }
    }
});
