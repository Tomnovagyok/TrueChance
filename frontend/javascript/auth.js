document.addEventListener('DOMContentLoaded', function () {
    const bejelentkezesBtn = document.getElementById('showLoginBtn');
    const regisztracioBtn = document.getElementById('showRegisterBtn');
    const bejelentkezesForm = document.getElementById('loginForm');
    const regisztracioForm = document.getElementById('registerForm');

    bejelentkezesBtn.addEventListener('click', function () {
        bejelentkezesBtn.classList.add('active');
        bejelentkezesForm.style.display = 'block';

        regisztracioBtn.classList.remove('active');
        regisztracioForm.style.display = 'none';

        hibaTorles();
    });

    regisztracioBtn.addEventListener('click', function () {
        regisztracioBtn.classList.add('active');
        regisztracioForm.style.display = 'block';

        bejelentkezesBtn.classList.remove('active');
        bejelentkezesForm.style.display = 'none';

        hibaTorles();
    });

    bejelentkezesForm.querySelector('form').addEventListener('submit', async function (event) {
        event.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const jelszo = document.getElementById('loginPassword').value;

        try {
            const valasz = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, jelszo: jelszo })
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

    function hibaMutat(szoveg) {
        let hibaElem = document.getElementById('hibaUzenet');

        if (!hibaElem) {
            hibaElem = document.createElement('div');
            hibaElem.id = 'hibaUzenet';
            hibaElem.classList.add('hiba-uzenet');

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

    const jelszoSzemGombok = document.querySelectorAll('.jelszo-szem-gomb');
    for (let i = 0; i < jelszoSzemGombok.length; i++) {
        jelszoSzemGombok[i].addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const ikon = this.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                ikon.classList.remove('fa-eye');
                ikon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                ikon.classList.remove('fa-eye-slash');
                ikon.classList.add('fa-eye');
            }
        });
    }
});
