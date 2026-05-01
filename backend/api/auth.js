const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); //?  npm install bcrypt - jelszó titkosításhoz kell
const database = require('../sql/database.js');

//! Regisztráció - POST /api/auth/register
router.post('/register', async (request, response) => {
    //?  Az adatok a request.body-ban érkeznek JSON formátumban
    const { nev, email, jelszo } = request.body;

    //?  Alap validáció - mindhárom mező kötelező
    if (!nev || !email || !jelszo) {
        return response.status(400).json({ uzenet: 'Minden mező kitöltése kötelező.' });
    }

    //?  Jelszó minimális hossza
    if (jelszo.length < 6) {
        return response.status(400).json({ uzenet: 'A jelszónak legalább 6 karakter hosszúnak kell lennie.' });
    }

    try {
        //?  Megnézzük, hogy ez az email már foglalt-e
        const meglevoFelhasznalo = await database.felhasznaloEmailAltal(email);
        if (meglevoFelhasznalo) {
            return response.status(409).json({ uzenet: 'Ez az email cím már regisztrálva van.' });
            //?  409 Conflict - az erőforrás már létezik
        }

        //?  A jelszót bcrypt-tel titkosítjuk, mielőtt adatbázisba kerül
        //?  A 10-es szám a "salt rounds" - minél nagyobb, annál biztonságosabb, de annál lassabb is
        //?  10 egy jó kompromisszum: biztonságos és még gyors
        const jelszoHash = await bcrypt.hash(jelszo, 10);

        //?  Felhasználó létrehozása az adatbázisban
        const ujFelhasznaloId = await database.felhasznaloLetrehoz(nev, email, jelszoHash);

        //?  Session indítása - a felhasználó automatikusan be van jelentkezve regisztráció után
        request.session.felhasznaloId = ujFelhasznaloId;

        response.status(201).json({ uzenet: 'Sikeres regisztráció!', nev: nev });
        //?  201 Created - sikeresen létrejött az erőforrás

    } catch (hiba) {
        console.error('Regisztrációs hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba. Próbáld újra később.' });
    }
});

//! Bejelentkezés - POST /api/auth/login
router.post('/login', async (request, response) => {
    const { email, jelszo } = request.body;

    if (!email || !jelszo) {
        return response.status(400).json({ uzenet: 'Email és jelszó megadása kötelező.' });
    }

    try {
        //?  Email alapján megkeressük a felhasználót az adatbázisban
        const felhasznalo = await database.felhasznaloEmailAltal(email);

        //?  Ha nincs ilyen felhasználó, UGYANAZT az üzenetet küldjük, mint rossz jelszónál
        //?  Biztonsági ok: ne derüljön ki, hogy melyik email van regisztrálva és melyik nincs
        if (!felhasznalo) {
            return response.status(401).json({ uzenet: 'Hibás email cím vagy jelszó.' });
        }

        //?  bcrypt.compare összehasonlítja a beírt jelszót a tárolt hash-sel
        //?  Nem kell magunknak visszafejtenük - a bcrypt csinálja
        const jelszoHelyes = await bcrypt.compare(jelszo, felhasznalo.jelszo_hash);

        if (!jelszoHelyes) {
            return response.status(401).json({ uzenet: 'Hibás email cím vagy jelszó.' });
        }

        //?  Session-be mentjük a felhasználó id-ját - ettől fog "bejelentkezettnek" számítani
        request.session.felhasznaloId = felhasznalo.id;

        response.status(200).json({ uzenet: 'Sikeres bejelentkezés!', nev: felhasznalo.nev });

    } catch (hiba) {
        console.error('Bejelentkezési hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba. Próbáld újra később.' });
    }
});

//! Kijelentkezés - POST /api/auth/logout
router.post('/logout', (request, response) => {
    //?  A session törlése = kijelentkezés
    //?  A destroy() eltávolítja a session-t a szerverről teljesen
    request.session.destroy((hiba) => {
        if (hiba) {
            return response.status(500).json({ uzenet: 'Kijelentkezési hiba.' });
        }
        response.status(200).json({ uzenet: 'Sikeres kijelentkezés.' });
    });
});

//! Session ellenőrzés - GET /api/auth/me
//?  Ezt hívja meg a frontend minden védett oldalon, hogy eldöntse: be van-e a felhasználó jelentkezve
router.get('/me', async (request, response) => {
    //?  Ha nincs session, nincs bejelentkezve
    if (!request.session.felhasznaloId) {
        return response.status(401).json({ uzenet: 'Nincs bejelentkezve.' });
    }

    try {
        //?  Session-ből lekérjük az aktuális felhasználó adatait
        const felhasznalo = await database.felhasznaloIdAltal(request.session.felhasznaloId);

        if (!felhasznalo) {
            //?  Ha a session létezik, de a felhasználó már nem létezik az adatbázisban
            request.session.destroy(() => {});
            return response.status(401).json({ uzenet: 'Érvénytelen session.' });
        }

        response.status(200).json({
            id: felhasznalo.id,
            nev: felhasznalo.nev,
            email: felhasznalo.email,
            egyenleg: felhasznalo.egyenleg,
            adminE: !!felhasznalo.admin_e
        });

    } catch (hiba) {
        console.error('Session ellenőrzési hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba.' });
    }
});

module.exports = router;
