const express = require('express');
const router = express.Router();
const database = require('../sql/database.js');

// Fogadási típusok szorzói
const szorzok = {
    szam: 36,
    tucat: 3,
    sor: 3,
    szin: 2,
    paros: 2,
    tartomany: 2
};

// A piros szín számok a rulett keréken
const pirosszamok = [32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12, 3];
const MAX_SZAM_FOGADAS_DB = 16;

// Fogadás kiértékelő: megnézi, hogy a kisorsolt szám alapján nyert-e az adott típusú fogadás
function fogadasEllenorzes(szam, tipus, ertek) {
    // Egyedi szám fogadás
    if (tipus === 'szam') {
        const fogadottSzam = parseInt(ertek);
        return szam === fogadottSzam;
    }

    // Szín fogadás (piros vagy fekete)
    if (tipus === 'szin') {
        if (szam === 0) {
            return false;
        }

        let pirosE = false;
        for (let index = 0; index < pirosszamok.length; index++) {
            if (pirosszamok[index] === szam) {
                pirosE = true;
                break;
            }
        }

        if (ertek === 'piros') {
            return pirosE;
        } else {
            return !pirosE;
        }
    }

    // Páros vagy páratlan fogadás
    if (tipus === 'paros') {
        if (szam === 0) {
            return false;
        }

        const parosE = szam % 2 === 0;

        if (ertek === 'paros') {
            return parosE;
        } else {
            return !parosE;
        }
    }

    // Alsó vagy felső tartomány fogadás (1-18 vagy 19-36)
    if (tipus === 'tartomany') {
        if (szam === 0) {
            return false;
        }

        if (ertek === 'also') {
            return szam <= 18;
        } else {
            return szam >= 19;
        }
    }

    // Tucat fogadás (1-12, 13-24, 25-36)
    if (tipus === 'tucat') {
        if (szam === 0) {
            return false;
        }

        const tucatSzam = parseInt(ertek);

        if (tucatSzam === 1) {
            return szam >= 1 && szam <= 12;
        }
        if (tucatSzam === 2) {
            return szam >= 13 && szam <= 24;
        }
        if (tucatSzam === 3) {
            return szam >= 25 && szam <= 36;
        }
        
        return false;
    }

    // Sor fogadás (függőleges sorok)
    if (tipus === 'sor') {
        if (szam === 0) {
            return false;
        }

        const sorSzam = parseInt(ertek);

        if (sorSzam === 3) {
            return szam % 3 === 0;
        }
        if (sorSzam === 2) {
            return szam % 3 === 2;
        }
        if (sorSzam === 1) {
            return szam % 3 === 1;
        }
        
        return false;
    }

    return false;
}

// Bemeneti adatok normalizálása: a usertől érkező adatokat egységes formára hozza (pl. stringbe), 
// és kiszűri a hibás értékeket (pl. túl nagy szám, vagy érvénytelen tucat)
function ertekNormalizal(tipus, ertek) {
    if (tipus === 'szam') {
        const szamErtek = parseInt(ertek);
        if (isNaN(szamErtek) || szamErtek < 0 || szamErtek > 36) {
            return null;
        }
        return String(szamErtek);
    }

    if (tipus === 'szin') {
        if (ertek === 'piros' || ertek === 'fekete') {
            return ertek;
        }
        return null;
    }

    if (tipus === 'paros') {
        if (ertek === 'paros' || ertek === 'paratlan') {
            return ertek;
        }
        return null;
    }

    if (tipus === 'tartomany') {
        if (ertek === 'also' || ertek === 'felso') {
            return ertek;
        }
        return null;
    }

    if (tipus === 'tucat') {
        const tucatErtek = parseInt(ertek);
        if (tucatErtek >= 1 && tucatErtek <= 3) {
            return String(tucatErtek);
        }
        return null;
    }

    if (tipus === 'sor') {
        const sorErtek = parseInt(ertek);
        if (sorErtek >= 1 && sorErtek <= 3) {
            return String(sorErtek);
        }
        return null;
    }

    return null;
}

// A teljes fogadási lista validálása: megnézi, hogy érvényesek-e a tétek,
// kiszűri a duplikációkat, és ellenőrzi a maximum limiteket (pl. max 16 számra fogadhat)
function fogadasokNormalizalasa(fogadasok) {
    if (!Array.isArray(fogadasok) || fogadasok.length === 0) {
        return { hiba: 'Legalább egy fogadást meg kell adni.' };
    }

    const normalizaltFogadasok = [];
    const fogadasKulcsok = {};
    let szamFogadasDb = 0;

    for (let index = 0; index < fogadasok.length; index++) {
        const fogadas = fogadasok[index];
        if (!fogadas || typeof fogadas !== 'object') {
            return { hiba: 'Érvénytelen fogadás lista.' };
        }

        const tipus = fogadas.tipus;
        const ertek = fogadas.ertek;

        if (!szorzok[tipus]) {
            return { hiba: 'Érvénytelen fogadás típus.' };
        }

        const normalizaltErtek = ertekNormalizal(tipus, ertek);
        if (normalizaltErtek === null) {
            return { hiba: 'Érvénytelen fogadás érték.' };
        }

        const kulcs = tipus + ':' + normalizaltErtek;
        if (fogadasKulcsok[kulcs]) {
            continue;
        }

        if (tipus === 'szam') {
            szamFogadasDb = szamFogadasDb + 1;
            if (szamFogadasDb > MAX_SZAM_FOGADAS_DB) {
                return { hiba: 'Maximum 16 számra lehet egyszerre fogadni.' };
            }
        }

        fogadasKulcsok[kulcs] = true;
        normalizaltFogadasok.push({ tipus: tipus, ertek: normalizaltErtek });
    }

    if (normalizaltFogadasok.length === 0) {
        return { hiba: 'Nincs érvényes fogadás.' };
    }

    return { fogadasok: normalizaltFogadasok };
}

// POST /api/roulette/spin - Rulett pörgetés végpont
// Fő játéklogika: fogadások ellenőrzése, egyenleg vizsgálat, pörgetés szimulálása (random szám), majd nyeremény kiszámolása és mentés
router.post('/spin', async (request, response) => {
    // Bejelentkezés ellenőrzése
    if (!request.session.felhasznaloId) {
        return response.status(401).json({ uzenet: 'Nincs bejelentkezve.' });
    }

    const tet = request.body.tet;

    // Tét ellenőrzése
    if (!tet || typeof tet !== 'number' || tet <= 0) {
        return response.status(400).json({ uzenet: 'Érvénytelen tét.' });
    }

    // Visszafelé kompatibilitás: ha régi kérés jön, átalakítjuk listára
    let kuldottFogadasok = request.body.fogadasok;
    if (!Array.isArray(kuldottFogadasok)) {
        if (request.body.tipus && request.body.ertek !== undefined) {
            kuldottFogadasok = [{ tipus: request.body.tipus, ertek: request.body.ertek }];
        } else {
            kuldottFogadasok = [];
        }
    }

    const normalizalasEredmeny = fogadasokNormalizalasa(kuldottFogadasok);
    if (normalizalasEredmeny.hiba) {
        return response.status(400).json({ uzenet: normalizalasEredmeny.hiba });
    }
    const fogadasok = normalizalasEredmeny.fogadasok;

    try {
        // Felhasználó adatainak lekérése
        const felhasznalo = await database.felhasznaloIdAltal(request.session.felhasznaloId);

        if (!felhasznalo) {
            return response.status(404).json({ uzenet: 'Felhasználó nem található.' });
        }

        // Összes tét kiszámítása (minden fogadás külön tét)
        const osszTet = tet * fogadasok.length;

        // Egyenleg ellenőrzése
        if (felhasznalo.egyenleg < osszTet) {
            return response.status(400).json({ uzenet: 'Nincs elég egyenleged!' });
        }

        // Véletlen szám generálása 0-36 között
        const kiszorsoltSzam = Math.floor(Math.random() * 37);

        // Nyerések ellenőrzése és nyeremény kiszámítása
        let nyertFogadasokDb = 0;
        let nyeremeny = 0;
        for (let index = 0; index < fogadasok.length; index++) {
            const fogadas = fogadasok[index];
            const talalat = fogadasEllenorzes(kiszorsoltSzam, fogadas.tipus, fogadas.ertek);
            if (talalat) {
                nyertFogadasokDb = nyertFogadasokDb + 1;
                nyeremeny = nyeremeny + tet * szorzok[fogadas.tipus];
            }
        }
        const nyert = nyertFogadasokDb > 0;

        // Új egyenleg kiszámítása
        const ujEgyenleg = felhasznalo.egyenleg - osszTet + nyeremeny;

        // Egyenleg frissítése az adatbázisban
        await database.egyenlegFrissit(request.session.felhasznaloId, ujEgyenleg);

        // Játékmenet naplózása
        await database.jatekmentNaploz(request.session.felhasznaloId, 'roulette', osszTet, nyeremeny, ujEgyenleg);

        // Szín meghatározása
        let szin = 'fekete';
        if (kiszorsoltSzam === 0) {
            szin = 'zold';
        } else {
            for (let index = 0; index < pirosszamok.length; index++) {
                if (pirosszamok[index] === kiszorsoltSzam) {
                    szin = 'piros';
                    break;
                }
            }
        }

        // Eredmény visszaküldése
        response.status(200).json({
            szam: kiszorsoltSzam,
            szin: szin,
            nyert: nyert,
            nyeremeny: nyeremeny,
            egyenleg: ujEgyenleg,
            osszTet: osszTet,
            nyertFogadasokDb: nyertFogadasokDb
        });
    } catch (hiba) {
        console.error('Roulette spin hiba:', hiba);
        response.status(500).json({ uzenet: 'Szerverhiba.' });
    }
});

module.exports = router;
