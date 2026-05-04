const express = require('express');
const router = express.Router();
const database = require('../sql/database.js');

const DAILY_COOLDOWN_MASODPERC = 24 * 60 * 60;
const DAILY_COOLDOWN_MS = DAILY_COOLDOWN_MASODPERC * 1000;

function hatralevoMasodpercSzamol(utolsoPorgetesDatum) {
    const utolsoPorgetes = new Date(utolsoPorgetesDatum).getTime();
    if (isNaN(utolsoPorgetes)) {
        return 0;
    }

    const kovetkezoPorgetes = utolsoPorgetes + DAILY_COOLDOWN_MS;
    const kulonbseg = kovetkezoPorgetes - Date.now();
    if (kulonbseg <= 0) {
        return 0;
    }

    return Math.ceil(kulonbseg / 1000);
}

function dailyAllapotValaszOsszeallit(felhasznalo) {
    const hatralevoMasodperc = hatralevoMasodpercSzamol(felhasznalo.daily_cash_utolso_porgetes);
    const porgetheto = hatralevoMasodperc === 0;

    const utolsoPorgetes = new Date(felhasznalo.daily_cash_utolso_porgetes);
    const kovetkezoPorgetes = new Date(utolsoPorgetes.getTime() + DAILY_COOLDOWN_MS);

    return {
        egyenleg: Number(felhasznalo.egyenleg) || 0,
        porgetheto: porgetheto,
        hatralevoMasodperc: hatralevoMasodperc,
        kovetkezoPorgetes: kovetkezoPorgetes.toISOString()
    };
}

// Véletlenszerű nyereményt sorsol: 25% eséllyel 500, 30% → 1000, 30% → 2000, 15% → 5000
function dailyNyeremenySorsolas() {
    const veletlen = Math.random() * 100;

    if (veletlen < 25) {
        return 500;
    }
    if (veletlen < 55) {
        return 1000;
    }
    if (veletlen < 85) {
        return 2000;
    }
    return 5000;
}

// Daily cash állapot - GET /api/daily-cash/allapot
router.get('/allapot', async (request, response) => {
    if (!request.session.felhasznaloId) {
        return response.status(401).json({ uzenet: 'Nincs bejelentkezve.' });
    }

    try {
        const felhasznalo = await database.dailyCashAllapotLekeres(request.session.felhasznaloId);
        if (!felhasznalo) {
            return response.status(404).json({ uzenet: 'Felhasználó nem található.' });
        }

        response.status(200).json(dailyAllapotValaszOsszeallit(felhasznalo));
    } catch (hiba) {
        console.error('Daily cash állapot lekérési hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba.' });
    }
});

// Daily cash pörgetés - POST /api/daily-cash/porgetes
router.post('/porgetes', async (request, response) => {
    if (!request.session.felhasznaloId) {
        return response.status(401).json({ uzenet: 'Nincs bejelentkezve.' });
    }

    try {
        const felhasznalo = await database.dailyCashAllapotLekeres(request.session.felhasznaloId);
        if (!felhasznalo) {
            return response.status(404).json({ uzenet: 'Felhasználó nem található.' });
        }

        const allapot = dailyAllapotValaszOsszeallit(felhasznalo);
        if (!allapot.porgetheto) {
            return response.status(429).json({
                uzenet: 'A daily cash még nem elérhető.',
                hatralevoMasodperc: allapot.hatralevoMasodperc,
                kovetkezoPorgetes: allapot.kovetkezoPorgetes
            });
        }

        const nyeremeny = dailyNyeremenySorsolas();
        const frissFelhasznalo = await database.dailyCashPorgetesJovairas(request.session.felhasznaloId, nyeremeny);

        if (!frissFelhasznalo) {
            const aktualisAllapot = await database.dailyCashAllapotLekeres(request.session.felhasznaloId);
            if (!aktualisAllapot) {
                return response.status(404).json({ uzenet: 'Felhasználó nem található.' });
            }
            const aktualisValasz = dailyAllapotValaszOsszeallit(aktualisAllapot);
            return response.status(429).json({
                uzenet: 'A daily cash pörgetés már fel lett használva.',
                hatralevoMasodperc: aktualisValasz.hatralevoMasodperc,
                kovetkezoPorgetes: aktualisValasz.kovetkezoPorgetes
            });
        }

        const frissAllapot = dailyAllapotValaszOsszeallit(frissFelhasznalo);

        response.status(200).json({
            uzenet: 'Sikeres daily cash pörgetés.',
            nyeremeny: nyeremeny,
            egyenleg: frissAllapot.egyenleg,
            hatralevoMasodperc: frissAllapot.hatralevoMasodperc,
            kovetkezoPorgetes: frissAllapot.kovetkezoPorgetes
        });
    } catch (hiba) {
        console.error('Daily cash pörgetési hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba.' });
    }
});

module.exports = router;
