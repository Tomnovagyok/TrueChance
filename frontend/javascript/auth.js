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
    });

    regisztracioBtn.addEventListener('click', function () {
        regisztracioBtn.classList.add('active');
        regisztracioForm.style.display = 'block';

        bejelentkezesBtn.classList.remove('active');
        bejelentkezesForm.style.display = 'none';
    });

    //!bejelentkezés
    bejelentkezesForm.querySelector('form').addEventListener('submit', function (event) {
        event.preventDefault(); //ez megakadályozza, hogy a form ténylegesen elküldésre kerüljön, nem lesz oldalfrissítés

        const email = document.getElementById('loginEmail').value;
        const jelszo = document.getElementById('loginPassword').value;

        if (email && jelszo) {
            alert('Sikeres bejelentkezés!\n\nEmail: ' + email);
            window.location.href = 'games.html';
        }
    });

    //!regisztráció
    regisztracioForm.querySelector('form').addEventListener('submit', function (event) {
        event.preventDefault();

        const nev = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const jelszo = document.getElementById('regPassword').value;
        const jelszoIsmet = document.getElementById('regPasswordConfirm').value;

        if (jelszo !== jelszoIsmet) {
            alert('A jelszavak nem egyeznek meg!');
            return;
        }

        if (nev && email && jelszo) {
            alert('Sikeres regisztráció!\n\nÜdvözlünk, ' + nev + '!');
            window.location.href = 'games.html';
        }
    });
});
