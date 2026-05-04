const express = require('express');
const router = express.Router();
const database = require('../sql/database.js');

const szorzok = {
    szam: 36,
    tucat: 3,
    sor: 3,
    szin: 2,
    paros: 2,
    tartomany: 2
};

const pirosszamok = [32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12, 3];
const MAX_SZAM_FOGADAS_DB = 16;

function fogadasEllenorzes(szam, tipus, ertek) {
    if (tipus === 'szam') {
        const fogadottSzam = parseInt(ertek);
        return szam === fogadottSzam;
    }

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
router.post('/spin', async (request, response) => {
    if (!request.session.felhasznaloId) {
        return response.status(401).json({ uzenet: 'Nincs bejelentkezve.' });
    }

    const tet = request.body.tet;

    if (!tet || typeof tet !== 'number' || tet <= 0) {
        return response.status(400).json({ uzenet: 'Érvénytelen tét.' });
    }

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
        const felhasznalo = await database.felhasznaloIdAltal(request.session.felhasznaloId);

        if (!felhasznalo) {
            return response.status(404).json({ uzenet: 'Felhasználó nem található.' });
        }

        const osszTet = tet * fogadasok.length;

        if (felhasznalo.egyenleg < osszTet) {
            return response.status(400).json({ uzenet: 'Nincs elég egyenleged!' });
        }

        const kiszorsoltSzam = Math.floor(Math.random() * 37);

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

        const ujEgyenleg = felhasznalo.egyenleg - osszTet + nyeremeny;

        await database.egyenlegFrissit(request.session.felhasznaloId, ujEgyenleg);

        await database.jatekmentNaploz(request.session.felhasznaloId, 'roulette', osszTet, nyeremeny, ujEgyenleg);

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
