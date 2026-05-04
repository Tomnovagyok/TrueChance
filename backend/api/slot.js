const express = require('express');
const router = express.Router();
const database = require('../sql/database.js');

const szimbolumok = [
    { nev: 'citrom', szorzo: 1.5, suly: 580 },
    { nev: 'eper', szorzo: 2, suly: 250 },
    { nev: 'kiwi', szorzo: 3, suly: 70 },
    { nev: 'ananasz', szorzo: 5, suly: 40 },
    { nev: 'sarkanygyumolcs', szorzo: 8, suly: 30 },
    { nev: 'seven', szorzo: 100, suly: 30 }
];

const OSZLOP_SZAM = 5;
const KIS_NYERES_ESELY = 0.125; // plusz esély alacsony (0.6x / 0.8x) nyerésre
const NEAR_MISS_ESELY = 0.3;
const KIS_NYERES_CITROM_ARANY = 0.62;

function sulyozottRandom() {
    let osszesSuly = 0;
    for (let index = 0; index < szimbolumok.length; index++) {
        osszesSuly = osszesSuly + szimbolumok[index].suly;
    }

    const veletlen = Math.random() * osszesSuly;
    let folyoOsszeg = 0;

    for (let index = 0; index < szimbolumok.length; index++) {
        folyoOsszeg = folyoOsszeg + szimbolumok[index].suly;
        if (veletlen < folyoOsszeg) {
            return szimbolumok[index];
        }
    }

    return szimbolumok[0];
}

function getSzimbolumByNev(nev) {
    for (let index = 0; index < szimbolumok.length; index++) {
        if (szimbolumok[index].nev === nev) {
            return szimbolumok[index];
        }
    }
    return null;
}

// Minden szimbólum valószínűségét kiszámolja (súly / összes súly) – az RTP számításhoz kell
function szimbolumValoszinusegek() {
    let osszesSuly = 0;
    for (let index = 0; index < szimbolumok.length; index++) {
        osszesSuly = osszesSuly + szimbolumok[index].suly;
    }

    const valoszinusegek = [];
    for (let index = 0; index < szimbolumok.length; index++) {
        const szimbolum = szimbolumok[index];
        valoszinusegek.push({
            nev: szimbolum.nev,
            szorzo: szimbolum.szorzo,
            valoszinuseg: szimbolum.suly / osszesSuly
        });
    }

    return valoszinusegek;
}

function szorzoEgyezesDbAlapjan(szimbolum, egyezoDb) {
    if (egyezoDb < 2) {
        return 0;
    }

    if (szimbolum.nev === 'seven' && egyezoDb === 2) {
        return 15;
    }

    const szorzatSzamal = [0, 0, 0.4, 1, 2, 4];
    return szimbolum.szorzo * szorzatSzamal[egyezoDb];
}

function slotElmeletiAdatokSzamol() {
    const valoszinusegek = szimbolumValoszinusegek();
    let alapRtpSzoro = 0;
    let alapNyeresiEsely = 0;

    for (let szimbolumIndex = 0; szimbolumIndex < valoszinusegek.length; szimbolumIndex++) {
        const szimbolum = valoszinusegek[szimbolumIndex];
        const p = szimbolum.valoszinuseg;

        for (let egyezoDb = 2; egyezoDb <= OSZLOP_SZAM; egyezoDb++) {
            // p^egyezoDb = pontosan ennyi azonos szimbólum valószínűsége egymás után
            let valoszinuseg = Math.pow(p, egyezoDb);
            if (egyezoDb < OSZLOP_SZAM) {
                // Ha nem az utolsó oszlopig tart, az (1-p) faktort is számítjuk
                valoszinuseg = valoszinuseg * (1 - p);
            }

            alapRtpSzoro = alapRtpSzoro + valoszinuseg * szorzoEgyezesDbAlapjan(szimbolum, egyezoDb);
        }

        alapNyeresiEsely = alapNyeresiEsely + p * p;
    }
    const alapVesztesEsely = Math.max(0, 1 - alapNyeresiEsely);
    const citromSzimbolum = getSzimbolumByNev('citrom');
    const eperSzimbolum = getSzimbolumByNev('eper');
    const citromSzorzo = citromSzimbolum ? szorzoEgyezesDbAlapjan(citromSzimbolum, 2) : 0;
    const eperSzorzo = eperSzimbolum ? szorzoEgyezesDbAlapjan(eperSzimbolum, 2) : 0;
    const kisNyeresAtlagSzorzo = KIS_NYERES_CITROM_ARANY * citromSzorzo + (1 - KIS_NYERES_CITROM_ARANY) * eperSzorzo;
    const kisNyeresRtpSzoro = alapVesztesEsely * KIS_NYERES_ESELY * kisNyeresAtlagSzorzo;
    const sessionRtpSzazalek = (alapRtpSzoro + kisNyeresRtpSzoro) * 100;
    const statikusHouseEdgeSzazalek = 100 - sessionRtpSzazalek;
    const statikusRoiSzazalek = -statikusHouseEdgeSzazalek;

    return {
        sessionRtpSzazalek: Number(sessionRtpSzazalek.toFixed(2)),
        statikusHouseEdgeSzazalek: Number(statikusHouseEdgeSzazalek.toFixed(2)),
        statikusRoiSzazalek: Number(statikusRoiSzazalek.toFixed(2))
    };
}

function nearMissKeszit(eredmenyek) {
    const tipusok = ['kozepen-tor-meg', 'negyediken-tor-meg', 'majdnem-jackpot'];
    const veletlen = Math.floor(Math.random() * tipusok.length);
    const valasztottTipus = tipusok[veletlen];

    if (valasztottTipus === 'kozepen-tor-meg') {
        const celSzimbolum = sulyozottRandom();
        eredmenyek[0] = celSzimbolum.nev;

        let masSzimbolum = sulyozottRandom();
        while (masSzimbolum.nev === celSzimbolum.nev) {
            masSzimbolum = sulyozottRandom();
        }

        eredmenyek[1] = masSzimbolum.nev;
        eredmenyek[2] = celSzimbolum.nev;
        eredmenyek[3] = celSzimbolum.nev;
        eredmenyek[4] = celSzimbolum.nev;

        return { volt: true, tipus: 'kozel' };
    }

    if (valasztottTipus === 'negyediken-tor-meg') {
        const celSzimbolum = sulyozottRandom();

        let masSzimbolum = sulyozottRandom();
        while (masSzimbolum.nev === celSzimbolum.nev) {
            masSzimbolum = sulyozottRandom();
        }

        eredmenyek[0] = masSzimbolum.nev;
        eredmenyek[1] = celSzimbolum.nev;
        eredmenyek[2] = celSzimbolum.nev;
        eredmenyek[3] = celSzimbolum.nev;
        eredmenyek[4] = celSzimbolum.nev;

        return { volt: true, tipus: 'kozel' };
    }

    if (valasztottTipus === 'majdnem-jackpot') {
        let masSzimbolum = sulyozottRandom();
        while (masSzimbolum.nev === 'seven') {
            masSzimbolum = sulyozottRandom();
        }

        eredmenyek[0] = masSzimbolum.nev;
        eredmenyek[1] = 'seven';
        eredmenyek[2] = 'seven';
        eredmenyek[3] = 'seven';
        eredmenyek[4] = 'seven';

        return { volt: true, tipus: 'majdnem-jackpot' };
    }

    return { volt: false, tipus: null };
}

function kisNyeresSzimbolumValaszt() {
    return Math.random() < 0.62 ? 'citrom' : 'eper';
}

// Első két oszlopba azonos szimbólumot tesz (garantált kis nyeremény),
// a maradék oszlopokba véletlen szimbólumokat, hogy ne jöjjön ki nagyobb kombináció
function kisNyeresKeszit(eredmenyek) {
    const nyeroSzimbolum = kisNyeresSzimbolumValaszt();
    eredmenyek[0] = nyeroSzimbolum;
    eredmenyek[1] = nyeroSzimbolum;

    let harmadik = sulyozottRandom();
    while (harmadik.nev === nyeroSzimbolum) {
        harmadik = sulyozottRandom();
    }
    eredmenyek[2] = harmadik.nev;
    eredmenyek[3] = sulyozottRandom().nev;
    eredmenyek[4] = sulyozottRandom().nev;
}

function nyeresKiszamol(eredmenyek, tet) {
    const elsoSzimbolum = eredmenyek[0];
    let egyezoDb = 1;

    for (let index = 1; index < OSZLOP_SZAM; index++) {
        if (eredmenyek[index] === elsoSzimbolum) {
            egyezoDb = egyezoDb + 1;
        } else {
            break;
        }
    }

    if (egyezoDb < 2) {
        return { nyert: false, db: 0, szimbolum: null, nyeremeny: 0 };
    }

    const szimbolum = getSzimbolumByNev(elsoSzimbolum);

    if (szimbolum.nev === 'seven' && egyezoDb === 2) {
        return { nyert: true, db: 2, szimbolum: szimbolum.nev, nyeremeny: tet * 15 };
    }

    const szorzatSzamal = [0, 0, 0.4, 1, 2, 4];
    const vegsoSzorzo = szimbolum.szorzo * szorzatSzamal[egyezoDb];
    const nyeremeny = tet * vegsoSzorzo;

    return { nyert: true, db: egyezoDb, szimbolum: szimbolum.nev, nyeremeny: nyeremeny };
}

//? GET /api/slot/statisztika – Elméleti RTP, house edge és ROI adatok lekérése
router.get('/statisztika', (request, response) => {
    if (!request.session.felhasznaloId) {
        return response.status(401).json({ uzenet: 'Nincs bejelentkezve.' });
    }

    const adatok = slotElmeletiAdatokSzamol();
    return response.status(200).json({
        sessionRtpSzazalek: adatok.sessionRtpSzazalek,
        statikusHouseEdgeSzazalek: adatok.statikusHouseEdgeSzazalek,
        statikusRoiSzazalek: adatok.statikusRoiSzazalek
    });
});

//? POST /api/slot/spin - Slot gép pörgetés végpont
router.post('/spin', async (request, response) => {
    if (!request.session.felhasznaloId) {
        return response.status(401).json({ uzenet: 'Nincs bejelentkezve.' });
    }

    if (request.session.slotForog) {
        return response.status(400).json({ uzenet: 'Már folyamatban van egy pörgetés.' });
    }

    const tet = request.body.tet;

    if (!tet || typeof tet !== 'number' || tet <= 0) {
        return response.status(400).json({ uzenet: 'Érvénytelen tét.' });
    }

    try {
        request.session.slotForog = true;

        const felhasznalo = await database.felhasznaloIdAltal(request.session.felhasznaloId);

        if (!felhasznalo) {
            return response.status(404).json({ uzenet: 'Felhasználó nem található.' });
        }

        if (felhasznalo.egyenleg < tet) {
            return response.status(400).json({ uzenet: 'Nincs elég egyenleged!' });
        }

        let eredmenyek = [];
        for (let index = 0; index < OSZLOP_SZAM; index++) {
            const szimbolum = sulyozottRandom();
            eredmenyek.push(szimbolum.nev);
        }

        let nyeresInfo = nyeresKiszamol(eredmenyek, tet);

        let nearMiss = { volt: false, tipus: null };
        if (!nyeresInfo.nyert) {
            const veletlenSzam = Math.random();

            if (veletlenSzam < KIS_NYERES_ESELY) {
                kisNyeresKeszit(eredmenyek);
                nyeresInfo = nyeresKiszamol(eredmenyek, tet);
            } else if (veletlenSzam < KIS_NYERES_ESELY + NEAR_MISS_ESELY) {
                nearMiss = nearMissKeszit(eredmenyek);
            }
        }

        let nyeremeny = 0;
        if (nyeresInfo.nyert) {
            nyeremeny = Math.floor(nyeresInfo.nyeremeny);
        }

        const ujEgyenleg = felhasznalo.egyenleg - tet + nyeremeny;

        await database.egyenlegFrissit(request.session.felhasznaloId, ujEgyenleg);

        await database.jatekmentNaploz(request.session.felhasznaloId, 'slot', tet, nyeremeny, ujEgyenleg);

        response.status(200).json({
            eredmenyek: eredmenyek,
            nyert: nyeresInfo.nyert,
            nyeremeny: nyeremeny,
            egyenleg: ujEgyenleg,
            nearMiss: nearMiss,
            nyeresInfo: nyeresInfo
        });
    } catch (hiba) {
        request.session.slotForog = false;
        console.error('Slot spin hiba:', hiba);
        response.status(500).json({ uzenet: 'Belső szerverhiba történt a pörgetés során.' });
    }
});

//? POST /api/slot/spin-finish - Jelzi a backendnek, hogy az animáció lefutott
router.post('/spin-finish', (request, response) => {
    if (request.session) {
        request.session.slotForog = false;
    }
    return response.status(200).json({ uzenet: 'Ok' });
});

module.exports = router;
