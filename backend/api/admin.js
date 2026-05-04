const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const database = require('../sql/database.js');

const emailMinta = /^[^\s@]+@gmail\.[a-z]{2,}$/i;

// Megnézi, hogy a bejelentkezett felhasználó admin-e; ha nem, azonnal elküld hibaválaszt
async function adminJogEllenorzes(request, response) {
    if (!request.session.felhasznaloId) {
        response.status(401).json({ uzenet: 'Nincs bejelentkezve.' });
        return null;
    }

    const felhasznalo = await database.felhasznaloIdAltal(request.session.felhasznaloId);
    if (!felhasznalo) {
        request.session.destroy(() => { });
        response.status(401).json({ uzenet: 'Érvénytelen session.' });
        return null;
    }

    if (!felhasznalo.admin_e) {
        response.status(403).json({ uzenet: 'Nincs admin jogosultságod.' });
        return null;
    }

    return felhasznalo;
}

// Csak a frontendnek szükséges mezőket adja vissza (jelszavat soha ne küldjünk!)
function adminFelhasznaloValasz(felhasznalo) {
    return {
        id: felhasznalo.id,
        nev: felhasznalo.nev,
        email: felhasznalo.email,
        egyenleg: Number(felhasznalo.egyenleg) || 0,
        adminE: !!felhasznalo.admin_e,
        letrehozva: felhasznalo.letrehozva
    };
}

// Felhasználók listázása - GET /api/admin/felhasznalok
router.get('/felhasznalok', async (request, response) => {
    try {
        const adminFelhasznalo = await adminJogEllenorzes(request, response);
        if (!adminFelhasznalo) {
            return;
        }

        const felhasznalok = await database.felhasznalokAdminLekerese();
        response.status(200).json({
            felhasznalok: felhasznalok.map(adminFelhasznaloValasz)
        });
    } catch (hiba) {
        console.error('Admin felhasználó lista hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba. Próbáld újra később.' });
    }
});

// Felhasználó módosítása - PUT /api/admin/felhasznalo/:id
router.put('/felhasznalo/:id', async (request, response) => {
    const felhasznaloId = Number(request.params.id);
    const nev = request.body.nev ? request.body.nev.trim() : '';
    const email = request.body.email ? request.body.email.trim() : '';
    const egyenleg = Number(request.body.egyenleg);
    const adminE = !!request.body.adminE;
    const ujJelszo = request.body.jelszo || '';

    if (!Number.isInteger(felhasznaloId) || felhasznaloId <= 0) {
        return response.status(400).json({ uzenet: 'Érvénytelen felhasználó azonosító.' });
    }
    if (!nev || !email) {
        return response.status(400).json({ uzenet: 'Név és email megadása kötelező.' });
    }
    if (nev.length < 2 || nev.length > 100) {
        return response.status(400).json({ uzenet: 'A név 2 és 100 karakter között lehet.' });
    }
    if (email.length > 150 || !emailMinta.test(email)) {
        return response.status(400).json({ uzenet: 'Érvénytelen email cím. Kötelező formátum: valami@gmail.domain' });
    }
    if (!Number.isFinite(egyenleg) || egyenleg < 0) {
        return response.status(400).json({ uzenet: 'Az egyenleg csak 0 vagy pozitív szám lehet.' });
    }
    if (ujJelszo && ujJelszo.length < 6) {
        return response.status(400).json({ uzenet: 'Az új jelszónak legalább 6 karakter hosszúnak kell lennie.' });
    }

    try {
        const adminFelhasznalo = await adminJogEllenorzes(request, response);
        if (!adminFelhasznalo) {
            return;
        }

        const celFelhasznalo = await database.felhasznaloIdAltal(felhasznaloId);
        if (!celFelhasznalo) {
            return response.status(404).json({ uzenet: 'Felhasználó nem található.' });
        }

        const masAltalHasznaltEmail = await database.felhasznaloEmailMasAltal(email, felhasznaloId);
        if (masAltalHasznaltEmail) {
            return response.status(409).json({ uzenet: 'Ez az email cím már használatban van.' });
        }

        let vegalsoAdminE = adminE;
        if (felhasznaloId === adminFelhasznalo.id) {
            vegalsoAdminE = !!celFelhasznalo.admin_e;
        }

        await database.felhasznaloAdminFrissit(felhasznaloId, nev, email, egyenleg, vegalsoAdminE);

        if (ujJelszo) {
            const ujJelszoHash = await bcrypt.hash(ujJelszo, 10);
            await database.felhasznaloJelszoFrissit(felhasznaloId, ujJelszoHash);
        }

        const frissFelhasznalo = await database.felhasznaloIdAltal(felhasznaloId);

        response.status(200).json({
            uzenet: 'Felhasználó adatai sikeresen mentve.',
            felhasznalo: adminFelhasznaloValasz(frissFelhasznalo)
        });
    } catch (hiba) {
        console.error('Admin felhasználó mentési hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba. Próbáld újra később.' });
    }
});

module.exports = router;
