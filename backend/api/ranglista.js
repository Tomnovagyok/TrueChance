const express = require('express');
const router = express.Router();
const database = require('../sql/database.js');

function ranglistaFelhasznaloValasz(felhasznalo) {
    return {
        id: felhasznalo.id,
        nev: felhasznalo.nev,
        egyenleg: Number(felhasznalo.egyenleg) || 0
    };
}

//! Ranglista lekérése - GET /api/ranglista/felhasznalok
router.get('/felhasznalok', async (request, response) => {
    if (!request.session.felhasznaloId) {
        return response.status(401).json({ uzenet: 'Nincs bejelentkezve.' });
    }

    try {
        const felhasznalok = await database.ranglistaFelhasznalokLekerese();
        response.status(200).json({
            felhasznalok: felhasznalok.map(ranglistaFelhasznaloValasz)
        });
    } catch (hiba) {
        console.error('Ranglista lekérési hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba. Próbáld újra később.' });
    }
});

module.exports = router;
