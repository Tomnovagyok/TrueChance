const express = require('express');
const router = express.Router();
const database = require('../sql/database.js');


// ------------------------------------------------------------
//!                     PÓKER BACKEND
//! A teljes játéklogika szerver oldalon fut.
//! A frontend csak megjelenít, semmilyen érzékeny adatot
//! (pakli, ellenfél lapjai, kiértékelés) nem kap meg.
// ------------------------------------------------------------

//?Kártya adatok
var SZAMOK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
var SZIMBOLUMOK = ['Pikk', 'Treff', 'Káró', 'Kör'];
var ERTEKEK = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
var NAGYVAK = 50;

//?Pakli létrehozása és Fisher-Yates keverés
function pakliLetrehozas() {
    var osszlap = [];
    for (var i = 0; i < SZIMBOLUMOK.length; i++) {
        for (var j = 0; j < SZAMOK.length; j++) {
            osszlap.push({ szimbolum: SZIMBOLUMOK[i], szam: SZAMOK[j], ertek: ERTEKEK[j] });
        }
    }
    for (var k = osszlap.length - 1; k > 0; k--) {
        var rand = Math.floor(Math.random() * (k + 1));
        var temp = osszlap[k];
        osszlap[k] = osszlap[rand];
        osszlap[rand] = temp;
    }
    return osszlap;
}

//?Kéz kiértékelés – az összes lapból (kéz + asztal) a legjobb kombinációt keresi
function kiert(jatekosKez, asztalLapok) {
    var aktivLapok = [jatekosKez[0], jatekosKez[1]];
    for (var i = 0; i < asztalLapok.length; i++) aktivLapok.push(asztalLapok[i]);

    var eredmeny = { ertek: 0, nev: 'Magas lap' };
    function ertekeles(szint, nev) {
        if (szint > eredmeny.ertek) {
            eredmeny.ertek = szint;
            eredmeny.nev = nev;
        }
    }

    // ---- Számok szerinti csoportosítás (összes lap) ----
    var szamSzamlalo = {};
    for (var i = 0; i < aktivLapok.length; i++) {
        var sz = aktivLapok[i].szam;
        szamSzamlalo[sz] = (szamSzamlalo[sz] || 0) + 1;
    }

    // Csoportok: hány darab négyes, hármas, kettes van
    var negyesek = 0,
        harmasok = 0,
        parok = 0;
    for (var sz in szamSzamlalo) {
        if (szamSzamlalo[sz] === 4) negyesek++;
        else if (szamSzamlalo[sz] === 3) harmasok++;
        else if (szamSzamlalo[sz] === 2) parok++;
    }

    // Póker (4 egyforma)
    if (negyesek >= 1) ertekeles(8, 'Póker');

    // Full House (legalább egy hármas + legalább egy pár, VAGY két hármas)
    if (harmasok >= 2 || (harmasok >= 1 && parok >= 1)) ertekeles(7, 'Full House');

    // Drill (pontosan egy hármas, nincs mellé pár ami full house lenne)
    if (harmasok >= 1 && eredmeny.ertek < 7) ertekeles(4, 'Drill');

    // Két pár
    if (parok >= 2 && eredmeny.ertek < 4) ertekeles(3, 'Két Pár');

    // Egy pár
    if (parok >= 1 && eredmeny.ertek < 3) ertekeles(2, 'Pár');

    // ---- Sor keresés (összes lap) ----
    var ertekLista = aktivLapok.map(function (l) {
        return l.ertek;
    });
    if (ertekLista.indexOf(14) !== -1) ertekLista.push(1); // Ász = 1 is
    var egyediErtekek = [];
    for (var i = 0; i < ertekLista.length; i++) {
        if (egyediErtekek.indexOf(ertekLista[i]) === -1) egyediErtekek.push(ertekLista[i]);
    }
    egyediErtekek.sort(function (a, b) {
        return a - b;
    });

    var vanesor = false,
        sorDb = 1,
        maxSorDb = 1;
    for (var k = 1; k < egyediErtekek.length; k++) {
        if (egyediErtekek[k] === egyediErtekek[k - 1] + 1) {
            sorDb++;
            if (sorDb > maxSorDb) maxSorDb = sorDb;
        } else sorDb = 1;
    }
    if (maxSorDb >= 5) {
        vanesor = true;
        ertekeles(5, 'Sor');
    }

    // ---- Flöss keresés (összes lap) ----
    var vanefloss = false,
        flosslapok = [];
    var szimbolumSzamlalo = { Pikk: 0, Treff: 0, Káró: 0, Kör: 0 };
    aktivLapok.forEach(function (lap) {
        szimbolumSzamlalo[lap.szimbolum]++;
    });
    var flossSzimbolum = null;
    for (var szimb in szimbolumSzamlalo) {
        if (szimbolumSzamlalo[szimb] >= 5) {
            flossSzimbolum = szimb;
            break;
        }
    }
    if (flossSzimbolum) {
        flosslapok = aktivLapok.filter(function (lap) {
            return lap.szimbolum === flossSzimbolum;
        });
        vanefloss = true;
        ertekeles(6, 'Flöss');
    }

    // ---- Szín Sor / Royal Flöss ----
    if (vanefloss && vanesor) {
        var flossErtekek = flosslapok.map(function (l) {
            return l.ertek;
        });
        if (flossErtekek.indexOf(14) !== -1) flossErtekek.push(1);
        var egyediFloss = [];
        for (var i = 0; i < flossErtekek.length; i++) {
            if (egyediFloss.indexOf(flossErtekek[i]) === -1) egyediFloss.push(flossErtekek[i]);
        }
        egyediFloss.sort(function (a, b) {
            return a - b;
        });
        var fSorDb = 1,
            maxFSorDb = 1;
        for (var m = 1; m < egyediFloss.length; m++) {
            if (egyediFloss[m] === egyediFloss[m - 1] + 1) {
                fSorDb++;
                if (fSorDb > maxFSorDb) maxFSorDb = fSorDb;
            } else fSorDb = 1;
        }
        if (maxFSorDb >= 5) {
            var royal = [10, 11, 12, 13, 14].every(function (e) {
                return egyediFloss.indexOf(e) !== -1;
            });
            if (royal) ertekeles(10, 'Royal flöss');
            else ertekeles(9, 'Szín Sor');
        }
    }

    var elsoLapErtek = jatekosKez[0].ertek;
    var masodikLapErtek = jatekosKez[1].ertek;
    if (masodikLapErtek > elsoLapErtek) {
        var tmp = elsoLapErtek;
        elsoLapErtek = masodikLapErtek;
        masodikLapErtek = tmp;
    }

    eredmeny.maxLap = elsoLapErtek;
    eredmeny.masodikLap = masodikLapErtek;
    return eredmeny;
}

function nyertesMeghatarozas(jatekosEredmeny, ellenfelEredmeny) {
    if (jatekosEredmeny.ertek > ellenfelEredmeny.ertek) {
        return 'jatekos';
    }
    if (jatekosEredmeny.ertek < ellenfelEredmeny.ertek) {
        return 'ellenfel';
    }

    if (jatekosEredmeny.maxLap > ellenfelEredmeny.maxLap) {
        return 'jatekos';
    }
    if (jatekosEredmeny.maxLap < ellenfelEredmeny.maxLap) {
        return 'ellenfel';
    }

    if (jatekosEredmeny.ertek === 0 && ellenfelEredmeny.ertek === 0) {
        if (jatekosEredmeny.masodikLap > ellenfelEredmeny.masodikLap) {
            return 'jatekos';
        }
        if (jatekosEredmeny.masodikLap < ellenfelEredmeny.masodikLap) {
            return 'ellenfel';
        }
    }

    return 'dontetlen';
}

function pokerStatikusMutatokSzimulacioval(mintaDb) {
    var korokSzama = Math.max(2000, Number(mintaDb) || 12000);
    var nyeresDb = 0;
    var dontetlenDb = 0;
    var nettoPont = 0;

    for (var kor = 0; kor < korokSzama; kor++) {
        var pakli = pakliLetrehozas();
        var jatekosKez = [pakli.pop(), pakli.pop()];
        var ellenfelKez = [pakli.pop(), pakli.pop()];
        var asztal = [pakli.pop(), pakli.pop(), pakli.pop(), pakli.pop(), pakli.pop()];

        var jatekosEredmeny = kiert(jatekosKez, asztal);
        var ellenfelEredmeny = kiert(ellenfelKez, asztal);
        var nyertes = nyertesMeghatarozas(jatekosEredmeny, ellenfelEredmeny);

        if (nyertes === 'jatekos') {
            nyeresDb++;
            nettoPont += 1;
        } else if (nyertes === 'ellenfel') {
            nettoPont -= 1;
        } else {
            dontetlenDb++;
        }
    }

    var roi = (nettoPont / korokSzama) * 100;
    var houseEdge = -roi;

    return {
        statikusHouseEdgeSzazalek: Number(houseEdge.toFixed(2)),
        statikusRoiSzazalek: Number(roi.toFixed(2)),
        nyeresiEselySzazalek: Number(((nyeresDb / korokSzama) * 100).toFixed(2)),
        dontetlenEselySzazalek: Number(((dontetlenDb / korokSzama) * 100).toFixed(2))
    };
}

var pokerStatikaCache = null;

function statikusPokerAdatok() {
    if (!pokerStatikaCache) {
        pokerStatikaCache = pokerStatikusMutatokSzimulacioval(8000);
    }
    return pokerStatikaCache;
}

//?Ellenfél döntés
function ellenfelAI(
    kez2,
    oszto,
    felforditottDb,
    aktualisTet,
    bloff,
    utolsoJatekosEmelesArany,
    ellenfelTartottMar,
    ellenfelEmeltMar,
    jatekosAllIn
) {
    var rand = Math.random();

    // Ha blöff mód aktív → végig agresszív (raise/call, soha nem fold)
    if (bloff) {
        if (jatekosAllIn && aktualisTet > 0) {
            return rand < 0.9 ? 'call' : 'fold';
        }
        if (aktualisTet > 0) {
            return rand < 0.6 ? 'raise' : 'call';
        } else {
            return rand < 0.7 ? 'raise' : 'check';
        }
    }

    var felfordított = [];
    for (var i = 0; i < felforditottDb; i++) felfordított.push(oszto[i]);
    var eredmeny = kiert(kez2, felfordított);
    var ero = eredmeny.ertek; // 0–10 közötti erősség
    var emelesNyomas = Math.max(0, Math.min(utolsoJatekosEmelesArany || 0, 1));

    var tartasAlap = 0.4;
    var emelesAlap = 0.1;

    // Pre-flop külön kezelés
    if (felforditottDb === 0) {
        tartasAlap = 0.55;
        emelesAlap = 0.25;

        if (ero >= 2) {
            tartasAlap += 0.1;
            emelesAlap += 0.05;
        }
    } else if (ero >= 9) {
        tartasAlap = 0.03;
        emelesAlap = 0.97;
    } else if (ero === 8) {
        tartasAlap = 0.4;
        emelesAlap = 0.59;
    } else if (ero === 7) {
        tartasAlap = 0.4;
        emelesAlap = 0.55;
    } else if (ero === 6) {
        tartasAlap = 0.4;
        emelesAlap = 0.5;
    } else if (ero === 5) {
        tartasAlap = 0.45;
        emelesAlap = 0.4;
    } else if (ero === 4) {
        tartasAlap = 0.45;
        emelesAlap = 0.35;
    } else if (ero === 3) {
        tartasAlap = 0.45;
        emelesAlap = 0.25;
    } else if (ero === 2) {
        tartasAlap = 0.4;
        emelesAlap = 0.2;
    }

    // A játékos emelésének mérete befolyásolja az AI-t:
    // minél nagyobb a százalék, annál kevésbé vállalja a tartást.
    if (aktualisTet > 0 && emelesNyomas > 0) {
        tartasAlap = Math.max(0.05, tartasAlap - emelesNyomas * 0.45);
        emelesAlap = Math.max(0.01, emelesAlap - emelesNyomas * 0.65);
    }

    // Ha korábban már tartott/emelt, kitartóbb lesz,
    // különösen erősebb kezekkel.
    if (ellenfelTartottMar) {
        if (ero >= 5) tartasAlap += 0.18;
        else if (ero >= 3) tartasAlap += 0.12;
        else tartasAlap += 0.07;
    }
    if (ellenfelEmeltMar) {
        if (ero >= 5) {
            tartasAlap += 0.16;
            emelesAlap += 0.1;
        } else {
            tartasAlap += 0.1;
            emelesAlap += 0.04;
        }
    }

    // Felfordított lapok hatása: minél több lap van kint, annál stabilabb döntés.
    var bonus = 0;
    if (felforditottDb >= 3) {
        bonus = (felforditottDb - 3) * 0.03;
    }
    tartasAlap = Math.min(tartasAlap + bonus, 0.95);
    emelesAlap = Math.min(emelesAlap + bonus, 0.95);

    if (aktualisTet > 0) {
        // All-inre az AI már nem emelhet: csak call vagy fold.
        if (jatekosAllIn) {
            return rand < tartasAlap ? 'call' : 'fold';
        }

        // Van tét → call / raise / fold (river-en SOHA nem fold, inkább call)
        if (rand < emelesAlap) return 'raise';
        else if (rand < emelesAlap + tartasAlap) return 'call';
        else return felforditottDb === 5 ? 'call' : 'fold';
    } else {
        // Nincs tét → raise / check (fold nincs, mert ingyen passzolhat)
        if (rand < emelesAlap) return 'raise';
        else return 'check';
    }
}

//?Session-ből játékállapot lekérése / alapértelmezés
function getJatek(session) {
    if (!session.poker) {
        session.poker = {
            jatekosZseton: 0,
            pot: 0,
            aktualisTet: 0,
            kez: [],
            kez2: [],
            oszto: [],
            pakli: [],
            felforditottDb: 0,
            jatekVege: false,
            varakozikDontesre: false,
            bloff: false,
            uzenet: '',
            uzenetTipus: '',
            jatekosOsszesBetje: 0,
            aktiv: false,
            ellenfelTartottMar: false,
            ellenfelEmeltMar: false,
            utolsoJatekosEmelesArany: 0,
            jatekosAllIn: false
        };
    }
    return session.poker;
}

//?Csak a frontendnek szükséges (biztonságos) adatok visszaadása
function biztonsagosAllapot(jatek) {
    // Az ellenfél lapjait és a paklit SOHA nem küldjük el, csak játék végén
    var ellenfelLapok = jatek.jatekVege ? jatek.kez2 : null;

    // Asztal lapjai: játék végén (showdown VAGY fold) → mind az 5, egyébként csak a felfordítottak
    var lathatolapok = [];
    if (jatek.jatekVege) {
        for (var i = 0; i < jatek.oszto.length; i++) {
            lathatolapok.push(jatek.oszto[i]);
        }
    } else {
        for (var i = 0; i < jatek.felforditottDb; i++) {
            lathatolapok.push(jatek.oszto[i]);
        }
    }

    // Kiértékeléshez használt asztali lapok: showdown → mind az 5, egyébként csak a felfordítottak
    var kiertLapok = [];
    if (jatek.felforditottDb === 5) {
        for (var i = 0; i < jatek.oszto.length; i++) kiertLapok.push(jatek.oszto[i]);
    } else {
        for (var i = 0; i < jatek.felforditottDb; i++) kiertLapok.push(jatek.oszto[i]);
    }

    // Játékos kéz kiértékelése
    var jatekosEredmeny = jatek.kez.length === 2 ? kiert(jatek.kez, kiertLapok) : { ertek: 0, nev: '–' };

    // Ellenfél kéz kiértékelése (csak játék végén)
    var ellenfelEredmeny = null;
    if (jatek.jatekVege && jatek.kez2.length === 2) {
        ellenfelEredmeny = kiert(jatek.kez2, kiertLapok);
    }

    return {
        jatekosZseton: jatek.jatekosZseton,
        pot: jatek.pot,
        aktualisTet: jatek.aktualisTet,
        kez: jatek.kez,
        ellenfelLapok: ellenfelLapok,
        asztalLapok: lathatolapok,
        felforditottDb: jatek.felforditottDb,
        jatekVege: jatek.jatekVege,
        varakozikDontesre: jatek.varakozikDontesre,
        jatekosKez: jatekosEredmeny.nev,
        ellenfelKez: ellenfelEredmeny ? ellenfelEredmeny.nev : null,
        uzenet: jatek.uzenet,
        uzenetTipus: jatek.uzenetTipus
    };
}

// ----------------------------------------------------------
//!                  PÓKER API VÉGPONTOK
// ----------------------------------------------------------

//?GET /api/poker/statisztika – Sztatikus szimulált mutatók
router.get('/poker/statisztika', (req, res) => {
    if (!req.session.felhasznaloId) {
        return res.status(401).json({ error: 'Nincs bejelentkezve' });
    }

    var statikusAdatok = statikusPokerAdatok();

    return res.status(200).json({
        statikusHouseEdgeSzazalek: statikusAdatok.statikusHouseEdgeSzazalek,
        statikusRoiSzazalek: statikusAdatok.statikusRoiSzazalek
    });
});

//?POST /api/poker/uj – Új leosztás indítása
router.post('/poker/uj', async (req, res) => {
    try {
        // Ha nincs bejelentkezve, hibaüzenet
        if (!req.session.felhasznaloId) {
            return res.status(401).json({ error: 'Nincs bejelentkezve' });
        }

        var jatek = getJatek(req.session);

        // Minden új kör elején frissítjük az egyenleget az adatbázisból,
        // hogy mindig biztosan az aktuális értékkel induljon a leosztás.
        const felhasznaloFriss = await database.felhasznaloIdAltal(req.session.felhasznaloId);
        if (!felhasznaloFriss) {
            return res.status(404).json({ error: 'Felhasználó nem található' });
        }
        const dbEgyenleg = parseFloat(felhasznaloFriss.egyenleg) || 0;

        // Minden új leosztás előtt az adatbázisból vesszük az aktuális egyenleget,
        // így nem maradhat bent régi session érték.
        jatek.jatekosZseton = dbEgyenleg;
        jatek.aktiv = true;

        // Pakli keverés és kártyák kiosztása
        jatek.pakli = pakliLetrehozas();
        jatek.kez = [jatek.pakli.pop(), jatek.pakli.pop()];
        jatek.kez2 = [jatek.pakli.pop(), jatek.pakli.pop()];
        jatek.oszto = [];
        for (var i = 0; i < 5; i++) jatek.oszto.push(jatek.pakli.pop());

        jatek.felforditottDb = 0;
        jatek.jatekVege = false;
        jatek.uzenet = '';
        jatek.uzenetTipus = '';

        // 20% eséllyel a bot blöfföl ebben a körben (végig agresszív)
        jatek.bloff = Math.random() < 0.2;
        jatek.ellenfelTartottMar = false;
        jatek.ellenfelEmeltMar = false;
        jatek.utolsoJatekosEmelesArany = 0;
        jatek.jatekosAllIn = false;

        // Vakok befizetése
        var kisVak = NAGYVAK / 2;

        // Ha nincs elég egyenlege a kisVak befizetéséhez, ne induljon el a játék
        if (jatek.jatekosZseton < kisVak) {
            return res.status(400).json({ error: 'Nincs elég egyenleged a játékhoz.' });
        }

        jatek.jatekosZseton -= kisVak;
        jatek.pot = kisVak + NAGYVAK;
        jatek.aktualisTet = NAGYVAK - kisVak;
        jatek.varakozikDontesre = true;
        jatek.jatekosOsszesBetje = kisVak; // Kör elején: kisVak elindítja a számlálást

        req.session.poker = jatek;

        // Azonnal frissítsd az adatbázist a vakok levonásával
        await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);

        res.json(biztonsagosAllapot(jatek));
    } catch (error) {
        console.error('Poker uj error:', error);
        res.status(500).json({ error: 'Új játék indítása sikertelen' });
    }
});

//?GET /api/poker/allapot – Aktuális állapot lekérdezése
router.get('/poker/allapot', (req, res) => {
    var jatek = getJatek(req.session);
    res.json(biztonsagosAllapot(jatek));
});

//?POST /api/poker/check – Játékos passzol
router.post('/poker/check', async (req, res) => {
    var jatek = getJatek(req.session);
    if (jatek.jatekVege || !jatek.varakozikDontesre) {
        return res.status(400).json({ hiba: 'Nem lehet most passzolni.' });
    }
    if (jatek.aktualisTet > 0) {
        return res.status(400).json({ hiba: 'Van aktív tét, nem lehet passzolni.' });
    }

    jatek.aktualisTet = 0;
    jatek.varakozikDontesre = false;

    // Ellenfél dönt
    var aiDontes = ellenfelAI(
        jatek.kez2,
        jatek.oszto,
        jatek.felforditottDb,
        jatek.aktualisTet,
        jatek.bloff,
        0,
        jatek.ellenfelTartottMar,
        jatek.ellenfelEmeltMar,
        false
    );
    vegrehajtEllenfelet(jatek, aiDontes);

    // Ha az ellenfél fold-ot csinál, rögzítsd az adatbázisba
    if (jatek.jatekVege && jatek.uzenetTipus === 'nyert' && req.session.felhasznaloId) {
        try {
            var alaptét = NAGYVAK + NAGYVAK / 2; // Vakok az elején betett összege
            var nyeremeny = jatek.pot; // Az ellenfél fold-ja miatt nyert pot
            await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);
            await database.jatekmentNaploz(req.session.felhasznaloId, 'poker', alaptét, nyeremeny, jatek.jatekosZseton);
        } catch (error) {
            console.error('Poker ellenfél fold rögzítés hiba:', error);
        }
    }

    // Ha a játék még nem vége, következő fázis
    if (!jatek.jatekVege) {
        await kovetkezoFazis(jatek, req.session.felhasznaloId);
    } else if (req.session.felhasznaloId && jatek.uzenetTipus !== 'nyert') {
        // Játék vége, de nem fold (showdown volt már rögzítve)
        await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);
    }

    res.json(biztonsagosAllapot(jatek));
});

//?POST /api/poker/call – Játékos tartja a tétet
router.post('/poker/call', async (req, res) => {
    try {
        var jatek = getJatek(req.session);

        if (jatek.jatekVege || !jatek.varakozikDontesre) {
            return res.status(400).json({ hiba: 'Nem lehet most tartani.' });
        }
        if (jatek.aktualisTet <= 0) {
            return res.status(400).json({ hiba: 'Nincs aktív tét amit tartani kellene.' });
        }

        var osszeg = Math.min(jatek.aktualisTet, jatek.jatekosZseton);
        jatek.jatekosZseton -= osszeg;
        jatek.pot += osszeg;
        jatek.aktualisTet = 0;
        jatek.varakozikDontesre = false;
        jatek.jatekosOsszesBetje += osszeg;
        jatek.jatekosAllIn = jatek.jatekosZseton <= 0;

        // Régi üzenet törlése mielőtt új fázis indul
        jatek.uzenet = '';
        jatek.uzenetTipus = '';

        // Azonnal frissítsd az adatbázist
        if (req.session.felhasznaloId) {
            await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);
        }

        // Játékos all-in call esetén automatikus showdown
        if (jatek.jatekosAllIn) {
            await allInAzonnaliShowdown(jatek, req.session.felhasznaloId);
            return res.json(biztonsagosAllapot(jatek));
        }

        // Ellenfél dönt
        var aiDontes = ellenfelAI(
            jatek.kez2,
            jatek.oszto,
            jatek.felforditottDb,
            jatek.aktualisTet,
            jatek.bloff,
            0,
            jatek.ellenfelTartottMar,
            jatek.ellenfelEmeltMar,
            false
        );
        vegrehajtEllenfelet(jatek, aiDontes);

        // Ha az ellenfél fold-ot csinál, rögzítsd az adatbázisba
        if (jatek.jatekVege && jatek.uzenetTipus === 'nyert' && req.session.felhasznaloId) {
            try {
                var jatekosOsszesBet = jatek.jatekosOsszesBetje;
                var nyeremeny = jatek.pot;
                await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);
                await database.jatekmentNaploz(req.session.felhasznaloId, 'poker', jatekosOsszesBet, nyeremeny, jatek.jatekosZseton);
                jatek.jatekosOsszesBetje = 0;
            } catch (error) {
                console.error('Poker ellenfél fold rögzítés hiba:', error);
            }
        }

        // Ha a játék még nem vége, következő fázis
        if (!jatek.jatekVege) {
            await kovetkezoFazis(jatek, req.session.felhasznaloId);
        } else if (req.session.felhasznaloId && jatek.uzenetTipus !== 'nyert') {
            // Játék vége, de nem fold (showdown volt már rögzítve)
            await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);
        }

        res.json(biztonsagosAllapot(jatek));
    } catch (error) {
        console.error('Call endpoint hiba:', error);
        res.status(500).json({ hiba: 'Hiba a tartás során' });
    }
});

//?POST /api/poker/raise – Játékos emel
router.post('/poker/raise', async (req, res) => {
    var jatek = getJatek(req.session);
    if (jatek.jatekVege || !jatek.varakozikDontesre) {
        return res.status(400).json({ hiba: 'Nem lehet most emelni.' });
    }

    var hivas = jatek.aktualisTet;
    var emeles = req.body && req.body.osszeg ? parseInt(req.body.osszeg) : NAGYVAK;
    if (isNaN(emeles) || emeles <= 0) {
        return res.status(400).json({ hiba: 'Érvénytelen emelési összeg.' });
    }

    var jatekosZsetonEmelesElott = jatek.jatekosZseton;
    var osszeg = hivas + emeles;
    if (osszeg > jatek.jatekosZseton) osszeg = jatek.jatekosZseton;

    if (osszeg <= 0 || jatek.jatekosZseton <= 0) {
        return res.status(400).json({ hiba: 'Nincs elég egyenleged az emeléshez.' });
    }

    var tenylegesEmeles = osszeg - hivas;
    if (tenylegesEmeles < 0) tenylegesEmeles = 0;

    jatek.jatekosZseton -= osszeg;
    jatek.pot += osszeg;
    jatek.aktualisTet = tenylegesEmeles;
    jatek.varakozikDontesre = false;
    jatek.jatekosOsszesBetje += osszeg;
    jatek.jatekosAllIn = jatek.jatekosZseton <= 0;

    var emelesArany = 0;
    if (jatekosZsetonEmelesElott > 0) {
        emelesArany = osszeg / jatekosZsetonEmelesElott;
        if (emelesArany > 1) emelesArany = 1;
    }
    jatek.utolsoJatekosEmelesArany = emelesArany;

    // Azonnal frissítsd az adatbázist
    if (req.session.felhasznaloId) {
        await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);
    }

    // Ellenfél dönt az emelésre
    var aiDontes = ellenfelAI(
        jatek.kez2,
        jatek.oszto,
        jatek.felforditottDb,
        jatek.aktualisTet,
        jatek.bloff,
        emelesArany,
        jatek.ellenfelTartottMar,
        jatek.ellenfelEmeltMar,
        jatek.jatekosAllIn
    );
    vegrehajtEllenfelet(jatek, aiDontes);

    if (jatek.jatekosAllIn && aiDontes === 'call' && !jatek.jatekVege) {
        await allInAzonnaliShowdown(jatek, req.session.felhasznaloId);
        return res.json(biztonsagosAllapot(jatek));
    }

    // Ha az ellenfél fold-ot csinál, rögzítsd az adatbázisba
    if (jatek.jatekVege && jatek.uzenetTipus === 'nyert' && req.session.felhasznaloId) {
        try {
            var jatekosOsszesBet = jatek.jatekosOsszesBetje;
            var nyeremeny = jatek.pot;
            await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);
            await database.jatekmentNaploz(req.session.felhasznaloId, 'poker', jatekosOsszesBet, nyeremeny, jatek.jatekosZseton);
            jatek.jatekosOsszesBetje = 0;
        } catch (error) {
            console.error('Poker ellenfél fold rögzítés hiba:', error);
        }
    }

    // Ha az ellenfél nem raise-t csinal, következő fázis
    if (!jatek.varakozikDontesre && !jatek.jatekVege) {
        await kovetkezoFazis(jatek, req.session.felhasznaloId);
    } else if (jatek.jatekVege && req.session.felhasznaloId && jatek.uzenetTipus !== 'nyert') {
        // Játék vége, de nem fold (showdown volt már rögzítve)
        await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);
    }

    res.json(biztonsagosAllapot(jatek));
});

//?POST /api/poker/fold – Játékos bedobja
router.post('/poker/fold', async (req, res) => {
    var jatek = getJatek(req.session);
    if (jatek.jatekVege || !jatek.varakozikDontesre) {
        return res.status(400).json({ hiba: 'Nem lehet most bedobni.' });
    }

    jatek.jatekVege = true;
    jatek.varakozikDontesre = false;
    jatek.pot = 0;
    jatek.uzenet = '❌ Bedobtad a lapjaid!';
    jatek.uzenetTipus = 'vesztett';

    // Adatbázis frissítés és játékmenet naplózása
    if (req.session.felhasznaloId) {
        try {
            await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);

            var jatekosOsszesBet = jatek.jatekosOsszesBetje;
            jatek.jatekosOsszesBetje = 0;
            await database.jatekmentNaploz(req.session.felhasznaloId, 'poker', jatekosOsszesBet, -jatekosOsszesBet, jatek.jatekosZseton);
        } catch (error) {
            console.error('Poker fold hiba:', error);
        }
    }

    res.json(biztonsagosAllapot(jatek));
});

// ----------------------------------------------------------
//!               PÓKER BELSŐ SEGÉDFÜGGVÉNYEK
// ----------------------------------------------------------

//?Ellenfél AI döntés végrehajtása
function vegrehajtEllenfelet(jatek, dontes) {
    if (dontes === 'check') {
        jatek.uzenet = 'Ellenfél: Passz (Check)';
        jatek.uzenetTipus = '';
        // Ne hívd meg itt a kovetkezoFazis-t, az az endpoint végzi
    } else if (dontes === 'call') {
        jatek.pot += jatek.aktualisTet;
        jatek.aktualisTet = 0;
        jatek.uzenet = 'Ellenfél: Tartás (Call) 💰';
        jatek.uzenetTipus = '';
        jatek.ellenfelTartottMar = true;
        // Ne hívd meg itt a kovetkezoFazis-t, az az endpoint végzi
    } else if (dontes === 'raise') {
        // Előbb kifizeti a meglévő tétet, majd NAGYVAK-kal emel
        if (jatek.jatekosAllIn) {
            jatek.pot += jatek.aktualisTet;
            jatek.aktualisTet = 0;
            jatek.uzenet = 'Ellenfél: Tartás (Call) 💰';
            jatek.uzenetTipus = '';
            jatek.ellenfelTartottMar = true;
            return;
        }
        jatek.pot += jatek.aktualisTet;
        jatek.pot += NAGYVAK;
        jatek.aktualisTet = NAGYVAK;
        jatek.uzenet = 'Ellenfél: Emelés (Raise) 💰';
        jatek.uzenetTipus = '';
        jatek.ellenfelTartottMar = true;
        jatek.ellenfelEmeltMar = true;
        // Játékosnak kell válaszolnia az emelésre
        jatek.varakozikDontesre = true;
    } else if (dontes === 'fold') {
        jatek.jatekosZseton += jatek.pot;
        jatek.pot = 0;
        jatek.jatekVege = true;
        jatek.uzenet = '🏆 Az ellenfél bedobta!';
        jatek.uzenetTipus = 'nyert';
    }
}

//?Következő fázis (flop/turn/river/showdown)
async function kovetkezoFazis(jatek, felhasznaloId) {
    if (jatek.jatekVege) return;

    if (jatek.felforditottDb < 5) {
        if (jatek.felforditottDb === 0)
            jatek.felforditottDb = 3; // Flop
        else jatek.felforditottDb++; // Turn / River

        if (jatek.felforditottDb === 5) {
            // Showdown
            jatek.jatekVege = true;
            await showdown(jatek, felhasznaloId);
        } else {
            // Következő tét-kör
            jatek.aktualisTet = 0;
            jatek.varakozikDontesre = true;
        }
    } else {
        jatek.jatekVege = true;
        await showdown(jatek, felhasznaloId);
    }
}

async function allInAzonnaliShowdown(jatek, felhasznaloId) {
    jatek.felforditottDb = 5;
    jatek.aktualisTet = 0;
    jatek.varakozikDontesre = false;
    jatek.jatekVege = true;
    await showdown(jatek, felhasznaloId);
}

//?Showdown – nyertes meghatározása és pot kiosztása
async function showdown(jatek, felhasznaloId) {
    var jatekosEredmeny = kiert(jatek.kez, jatek.oszto);
    var ellenfelEredmeny = kiert(jatek.kez2, jatek.oszto);

    var nyertes = nyertesMeghatarozas(jatekosEredmeny, ellenfelEredmeny);

    var ujEgyenleg = jatek.jatekosZseton;
    var nyeremeny = 0;
    var jatekosOsszesBet = jatek.jatekosOsszesBetje;

    if (nyertes === 'jatekos') {
        jatek.uzenet = '🏆 Te nyertél! +' + jatek.pot + ' 💰';
        jatek.uzenetTipus = 'nyert';
        jatek.jatekosZseton += jatek.pot;
        ujEgyenleg = jatek.jatekosZseton;
        nyeremeny = jatek.pot;
    } else if (nyertes === 'ellenfel') {
        jatek.uzenet = '❌ Az ellenfél nyert! -' + jatek.pot + ' 💰';
        jatek.uzenetTipus = 'vesztett';
        ujEgyenleg = jatek.jatekosZseton;
        nyeremeny = -jatek.pot;
    } else {
        jatek.uzenet = '🤝 Döntetlen! Tét visszaosztva.';
        jatek.uzenetTipus = 'dontetlen';
        jatek.jatekosZseton += jatek.pot / 2;
        ujEgyenleg = jatek.jatekosZseton;
        nyeremeny = 0;
    }

    jatek.pot = 0;
    jatek.jatekosOsszesBetje = 0;

    // Adatbázis frissítés
    if (felhasznaloId) {
        try {
            await database.egyenlegFrissit(felhasznaloId, ujEgyenleg);

            // Játékmenet naplózása
            await database.jatekmentNaploz(felhasznaloId, 'poker', jatekosOsszesBet, nyeremeny, ujEgyenleg);
        } catch (error) {
            console.error('Poker egyenleg frissítés hiba:', error);
        }
    }
}

module.exports = router;
