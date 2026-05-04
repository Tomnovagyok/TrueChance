const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const database = require('../sql/database.js');

const emailMinta = /^[^\s@]+@gmail\.[a-z]{2,}$/i;

// Regisztráció - POST /api/auth/register
// 1. Megnézi, létezik-e már az email
// 2. Ha nem, jelszót hashel, lementi az adatbázisba
// 3. Automatikusan be is jelentkezteti a felhasználót (session ID beállításával)
router.post('/register', async (request, response) => {
    const nev = request.body.nev ? request.body.nev.trim() : '';
    const email = request.body.email ? request.body.email.trim() : '';
    const jelszo = request.body.jelszo || '';

    if (!nev || !email || !jelszo) {
        return response.status(400).json({ uzenet: 'Minden mező kitöltése kötelező.' });
    }

    if (jelszo.length < 6) {
        return response.status(400).json({ uzenet: 'A jelszónak legalább 6 karakter hosszúnak kell lennie.' });
    }

    if (email.length > 150 || !emailMinta.test(email)) {
        return response.status(400).json({ uzenet: 'Érvénytelen email cím. Kötelező formátum: valami@gmail.domain' });
    }

    try {
        const meglevoFelhasznalo = await database.felhasznaloEmailAltal(email);
        if (meglevoFelhasznalo) {
            return response.status(409).json({ uzenet: 'Ez az email cím már regisztrálva van.' });
        }

        // A jelszót titkosítjuk mielőtt eltároljuk (10-es erősség = biztonságos, de nem túl lassú)
        const jelszoHash = await bcrypt.hash(jelszo, 10);

        const ujFelhasznaloId = await database.felhasznaloLetrehoz(nev, email, jelszoHash);

        request.session.felhasznaloId = ujFelhasznaloId;

        response.status(201).json({ uzenet: 'Sikeres regisztráció!', nev: nev });

    } catch (hiba) {
        console.error('Regisztrációs hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba. Próbáld újra később.' });
    }
});

// Bejelentkezés - POST /api/auth/login
// 1. Felhasználó keresése email alapján
// 2. Bcrypt.compare segítségével a megadott jelszó és a hashelt jelszó összehasonlítása
// 3. Ha helyes, session létrehozása
router.post('/login', async (request, response) => {
    const email = request.body.email ? request.body.email.trim() : '';
    const jelszo = request.body.jelszo || '';

    if (!email || !jelszo) {
        return response.status(400).json({ uzenet: 'Email és jelszó megadása kötelező.' });
    }

    if (email.length > 150 || !emailMinta.test(email)) {
        return response.status(400).json({ uzenet: 'Érvénytelen email cím. Kötelező formátum: valami@gmail.domain' });
    }

    try {
        const felhasznalo = await database.felhasznaloEmailAltal(email);

        if (!felhasznalo) {
            return response.status(401).json({ uzenet: 'Hibás email cím vagy jelszó.' });
        }

        const jelszoHelyes = await bcrypt.compare(jelszo, felhasznalo.jelszo_hash);

        if (!jelszoHelyes) {
            return response.status(401).json({ uzenet: 'Hibás email cím vagy jelszó.' });
        }

        request.session.felhasznaloId = felhasznalo.id;

        response.status(200).json({ uzenet: 'Sikeres bejelentkezés!', nev: felhasznalo.nev });

    } catch (hiba) {
        console.error('Bejelentkezési hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba. Próbáld újra később.' });
    }
});

// Kijelentkezés - POST /api/auth/logout
router.post('/logout', (request, response) => {
    request.session.destroy((hiba) => {
        if (hiba) {
            return response.status(500).json({ uzenet: 'Kijelentkezési hiba.' });
        }
        response.status(200).json({ uzenet: 'Sikeres kijelentkezés.' });
    });
});

// Session ellenőrzés - GET /api/auth/me
// A frontend ezt a végpontot hívja meg oldalbetöltéskor, hogy megnézze: be van-e jelentkezve a user.
// Visszaadja a user alapvető adatait, ha van érvényes session.
router.get('/me', async (request, response) => {
    if (!request.session.felhasznaloId) {
        return response.status(401).json({ uzenet: 'Nincs bejelentkezve.' });
    }

    try {
        const felhasznalo = await database.felhasznaloIdAltal(request.session.felhasznaloId);

        if (!felhasznalo) {
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
