const express = require('express');
const router = express.Router();
const database = require('../sql/database.js');

//! Statisztikák lekérése - GET /api/stats/jatekmenetek
//?  Csak bejelentkezett felhasználó férhet hozzá a saját statisztikáihoz
router.get('/jatekmenetek', async (request, response) => {
    //?  Ellenőrizzük, hogy be van-e jelentkezve
    if (!request.session.felhasznaloId) {
        return response.status(401).json({ uzenet: 'Jelentkezz be a statisztikák megtekintéséhez.' });
    }

    try {
        //?  Lekérjük az összes játékmenetet a bejelentkezett felhasználóhoz
        const jatekmenetek = await database.jatekmenetekLekerese(request.session.felhasznaloId);
        
        //?  Sikeres lekérés - visszaküldjük a játékmeneteket
        response.status(200).json({ jatekmenetek: jatekmenetek });
        
    } catch (hiba) {
        console.error('Statisztika lekérési hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba. Próbáld újra később.' });
    }
});

module.exports = router;
