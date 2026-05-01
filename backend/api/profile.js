const express = require('express');
const multer = require('multer');
const router = express.Router();
const database = require('../sql/database.js');

const upload = multer();
const emailMinta = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jatekEselyekKiszamol(jatekonkentiSorok) {
    const alap = {
        slot: { osszesKor: 0, nyertKor: 0, nyeresiArany: 0 },
        roulette: { osszesKor: 0, nyertKor: 0, nyeresiArany: 0 },
        blackjack: { osszesKor: 0, nyertKor: 0, nyeresiArany: 0 },
        poker: { osszesKor: 0, nyertKor: 0, nyeresiArany: 0 }
    };

    for (let index = 0; index < jatekonkentiSorok.length; index++) {
        const sor = jatekonkentiSorok[index];
        const osszesKor = Number(sor.osszes_kor) || 0;
        const nyertKor = Number(sor.nyert_kor) || 0;
        const nyeresiArany = osszesKor > 0 ? Number(((nyertKor / osszesKor) * 100).toFixed(1)) : 0;

        if (alap[sor.jatek_tipus]) {
            alap[sor.jatek_tipus] = {
                osszesKor: osszesKor,
                nyertKor: nyertKor,
                nyeresiArany: nyeresiArany
            };
        }
    }

    return alap;
}

function profilValaszOsszeallit(adatok) {
    const felhasznalo = adatok.felhasznalo;
    const osszesitett = adatok.osszesitett || {};

    const letrehozvaDatum = new Date(felhasznalo.letrehozva);
    let regisztraltNapok = 0;

    if (!isNaN(letrehozvaDatum.getTime())) {
        const kulonbseg = Date.now() - letrehozvaDatum.getTime();
        regisztraltNapok = Math.max(0, Math.floor(kulonbseg / (1000 * 60 * 60 * 24)));
    }

    return {
        id: felhasznalo.id,
        nev: felhasznalo.nev,
        email: felhasznalo.email,
        egyenleg: Number(felhasznalo.egyenleg) || 0,
        letrehozva: felhasznalo.letrehozva,
        regisztraltNapok: regisztraltNapok,
        osszesJatek: Number(osszesitett.osszes_kor) || 0,
        osszesEljatszottPenz: Number(osszesitett.osszes_eljatszott_penz) || 0,
        osszesNyertPenz: Number(osszesitett.osszes_nyert_penz) || 0,
        osszesVesztettPenz: Number(osszesitett.osszes_vesztett_penz) || 0,
        jatekNyeresiEselyek: jatekEselyekKiszamol(adatok.jatekonkenti || [])
    };
}

//! Profil adatok lekérése - GET /api/profile/adatok
router.get('/adatok', async (request, response) => {
    if (!request.session.felhasznaloId) {
        return response.status(401).json({ uzenet: 'Nincs bejelentkezve.' });
    }

    try {
        const profilAdatok = await database.felhasznaloProfilAdatokLekerese(request.session.felhasznaloId);

        if (!profilAdatok) {
            return response.status(404).json({ uzenet: 'Felhasználó nem található.' });
        }

        response.status(200).json({
            profil: profilValaszOsszeallit(profilAdatok)
        });
    } catch (hiba) {
        console.error('Profil adatok lekérési hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba. Próbáld újra később.' });
    }
});

//! Profil frissítés - PUT /api/profile/frissites (FormData)
router.put('/frissites', upload.none(), async (request, response) => {
    if (!request.session.felhasznaloId) {
        return response.status(401).json({ uzenet: 'Nincs bejelentkezve.' });
    }

    const nev = request.body.nev ? request.body.nev.trim() : '';
    const email = request.body.email ? request.body.email.trim() : '';

    if (!nev || !email) {
        return response.status(400).json({ uzenet: 'Név és email megadása kötelező.' });
    }

    if (nev.length < 2 || nev.length > 100) {
        return response.status(400).json({ uzenet: 'A név 2 és 100 karakter között lehet.' });
    }

    if (email.length > 150 || !emailMinta.test(email)) {
        return response.status(400).json({ uzenet: 'Érvénytelen email cím.' });
    }

    try {
        const masAltalHasznaltEmail = await database.felhasznaloEmailMasAltal(email, request.session.felhasznaloId);
        if (masAltalHasznaltEmail) {
            return response.status(409).json({ uzenet: 'Ez az email cím már használatban van.' });
        }

        await database.felhasznaloProfilFrissit(request.session.felhasznaloId, nev, email);

        const frissProfilAdatok = await database.felhasznaloProfilAdatokLekerese(request.session.felhasznaloId);
        if (!frissProfilAdatok) {
            return response.status(404).json({ uzenet: 'Felhasználó nem található.' });
        }

        response.status(200).json({
            uzenet: 'Profil adatai sikeresen mentve.',
            profil: profilValaszOsszeallit(frissProfilAdatok)
        });
    } catch (hiba) {
        console.error('Profil mentési hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba. Próbáld újra később.' });
    }
});

module.exports = router;
