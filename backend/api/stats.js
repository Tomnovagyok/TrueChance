const express = require('express');
const router = express.Router();
const database = require('../sql/database.js');

// Játékmenetek lekérése - GET /api/stats/jatekmenetek
router.get('/jatekmenetek', async (request, response) => {
    if (!request.session.felhasznaloId) {
        return response.status(401).json({ uzenet: 'Jelentkezz be a statisztikák megtekintéséhez.' });
    }

    try {
        const jatekmenetek = await database.jatekmenetekLekerese(request.session.felhasznaloId);

        response.status(200).json({ jatekmenetek: jatekmenetek });

    } catch (hiba) {
        console.error('Statisztika lekérési hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba. Próbáld újra később.' });
    }
});

module.exports = router;
