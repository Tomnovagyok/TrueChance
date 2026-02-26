const express = require('express');
const router = express.Router();
const database = require('../sql/database.js');
const fs = require('fs/promises');

//!Multer
const multer = require('multer'); //?npm install multer
const path = require('path');

const storage = multer.diskStorage({
    destination: (request, file, callback) => {
        callback(null, path.join(__dirname, '../uploads'));
    },
    filename: (request, file, callback) => {
        callback(null, Date.now() + '-' + file.originalname); //?egyedi név: dátum - file eredeti neve
    }
});

const upload = multer({ storage });

//!Endpoints:
//?GET /api/test
router.get('/test', (request, response) => {
    response.status(200).json({
        message: 'Ez a végpont működik.'
    });
});

//?GET /api/testsql
router.get('/testsql', async (request, response) => {
    try {
        const selectall = await database.selectall();
        response.status(200).json({
            message: 'Ez a végpont működik.',
            results: selectall
        });
    } catch (error) {
        response.status(500).json({
            message: 'Ez a végpont nem működik.'
        });
    }
});

// ============================================================
//!                     PÓKER BACKEND
//! A teljes játéklogika szerver oldalon fut.
//! A frontend csak megjelenít, semmilyen érzékeny adatot
//! (pakli, ellenfél lapjai, kiértékelés) nem kap meg.
// ============================================================

//?Kártya adatok
var SZAMOK = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
var SZIMBOLUMOK = ["Pikk", "Treff", "Káró", "Kör"];
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

//?Kéz kiértékelés (azonos a korábbi kiert() függvénnyel)
function kiert(jatekosKez, asztalLapok) {
    var aktivLapok = [jatekosKez[0], jatekosKez[1]];
    for (var i = 0; i < asztalLapok.length; i++) aktivLapok.push(asztalLapok[i]);

    var eredmeny = { ertek: 0, nev: "Magas lap" };
    function ertekeles(szint, nev) {
        if (szint > eredmeny.ertek) { eredmeny.ertek = szint; eredmeny.nev = nev; }
    }

    var kezpar = jatekosKez[0].szam === jatekosKez[1].szam;
    var kez_1_db = 1, kez_2_db = 1;
    if (kezpar) { kez_1_db++; kez_2_db++; }

    for (var i = 0; i < asztalLapok.length; i++) {
        if (jatekosKez[0].szam === asztalLapok[i].szam) kez_1_db++;
        if (jatekosKez[1].szam === asztalLapok[i].szam) kez_2_db++;
    }

    var maxDb = Math.max(kez_1_db, kez_2_db);
    if (maxDb === 4) ertekeles(8, "Póker");
    else if (maxDb === 3) ertekeles(4, "Drill");
    else if (maxDb === 2) {
        if (kez_1_db === 2 && kez_2_db === 2 && !kezpar) ertekeles(3, "Két Pár");
        else if (kezpar) ertekeles(2, "Kézpár");
        else ertekeles(2, "Pár");
    }

    if (!kezpar) {
        // Két különböző kézlap → az egyik drill, a másik legalább pár = Full House
        if ((kez_1_db === 3 && kez_2_db >= 2) || (kez_2_db === 3 && kez_1_db >= 2)) ertekeles(7, "Full House");
    } else {
        var vanMasikPar = false;
        var asztalSzamlalo = {};
        for (var i = 0; i < asztalLapok.length; i++) {
            var sz = asztalLapok[i].szam;
            if (sz !== jatekosKez[0].szam) { // Csak a kézpártól ELTÉRŐ számokat nézzük
                asztalSzamlalo[sz] = (asztalSzamlalo[sz] || 0) + 1;
            }
        }
        for (var sz in asztalSzamlalo) {
            if (asztalSzamlalo[sz] >= 2) { vanMasikPar = true; break; }
        }
        if (kez_1_db >= 3 && vanMasikPar) ertekeles(7, "Full House");
    }

    var ertekLista = aktivLapok.map(function(l) { return l.ertek; });
    if (ertekLista.indexOf(14) !== -1) ertekLista.push(1);
    var egyediErtekek = [];
    for (var i = 0; i < ertekLista.length; i++) {
        if (egyediErtekek.indexOf(ertekLista[i]) === -1) egyediErtekek.push(ertekLista[i]);
    }
    egyediErtekek.sort(function(a, b) { return a - b; });

    var vanesor = false, sorDb = 1, maxSorDb = 1;
    for (var k = 1; k < egyediErtekek.length; k++) {
        if (egyediErtekek[k] === egyediErtekek[k - 1] + 1) { sorDb++; if (sorDb > maxSorDb) maxSorDb = sorDb; }
        else sorDb = 1;
    }
    if (maxSorDb >= 5) { vanesor = true; ertekeles(5, "Sor"); }

    var vanefloss = false, flosslapok = [];
    var szimbolumSzamlalo = { "Pikk": 0, "Treff": 0, "Káró": 0, "Kör": 0 };
    aktivLapok.forEach(function(lap) { szimbolumSzamlalo[lap.szimbolum]++; });
    var flossSzimbolum = null;
    for (var szimb in szimbolumSzamlalo) {
        if (szimbolumSzamlalo[szimb] >= 5) { flossSzimbolum = szimb; break; }
    }
    if (flossSzimbolum && (jatekosKez[0].szimbolum === flossSzimbolum || jatekosKez[1].szimbolum === flossSzimbolum)) {
        flosslapok = aktivLapok.filter(function(lap) { return lap.szimbolum === flossSzimbolum; });
        vanefloss = true;
        ertekeles(6, "Flöss");
    }

    if (vanefloss && vanesor) {
        var flossErtekek = flosslapok.map(function(l) { return l.ertek; });
        if (flossErtekek.indexOf(14) !== -1) flossErtekek.push(1);
        var egyediFloss = [];
        for (var i = 0; i < flossErtekek.length; i++) {
            if (egyediFloss.indexOf(flossErtekek[i]) === -1) egyediFloss.push(flossErtekek[i]);
        }
        egyediFloss.sort(function(a, b) { return a - b; });
        var fSorDb = 1, maxFSorDb = 1;
        for (var m = 1; m < egyediFloss.length; m++) {
            if (egyediFloss[m] === egyediFloss[m - 1] + 1) { fSorDb++; if (fSorDb > maxFSorDb) maxFSorDb = fSorDb; }
            else fSorDb = 1;
        }
        if (maxFSorDb >= 5) {
            var royal = [10, 11, 12, 13, 14].every(function(e) { return egyediFloss.indexOf(e) !== -1; });
            if (royal) ertekeles(10, "Királyi Sor");
            else ertekeles(9, "Szín Sor");
        }
    }

    eredmeny.maxLap = Math.max(jatekosKez[0].ertek, jatekosKez[1].ertek);
    return eredmeny;
}

//?Ellenfél AI döntés
function ellenfelAI(kez2, oszto, felforditottDb, aktualisTet) {
    var felfordított = [];
    for (var i = 0; i < felforditottDb; i++) felfordított.push(oszto[i]);
    var eredmeny = kiert(kez2, felfordított);
    var ero = eredmeny.ertek;
    var rand = Math.random();

    // Pre-flop (0 lap felfordítva) → agresszívebb AI
    if (felforditottDb === 0 || ero >= 6) {
        if (aktualisTet > 0) {
            // Játékos emelt → szinte mindig tartja, erős kézzel vissza is emel
            if (ero >= 2) return rand < 0.5 ? "raise" : "call";
            else return rand < 0.9 ? "call" : "fold";
        } else {
            // Nincs tét → gyakran emel
            if (ero >= 2) return rand < 0.8 ? "raise" : "check";
            else return rand < 0.5 ? "raise" : "check";
        }
    }

    // Flop / Turn / River → normál AI
    if (aktualisTet > 0) {
        if (ero >= 8) return "raise";
        else if (ero >= 2) return rand < 0.8 ? "call" : "fold";
        else return rand < 0.6 ? "call" : "fold";
    } else {
        if (ero >= 4) return rand < 0.8 ? "raise" : "check";
        else if (ero >= 2) return rand < 0.4 ? "raise" : "check";
        else return rand < 0.2 ? "raise" : "check";
    }
}

//?Session-ből játékállapot lekérése / alapértelmezés
function getJatek(session) {
    if (!session.poker) {
        session.poker = {
            jatekosZseton: 1000,
            ellenfelZseton: 1000,
            pot: 0,
            aktualisTet: 0,
            kez: [],
            kez2: [],
            oszto: [],
            pakli: [],
            felforditottDb: 0,
            jatekVege: false,
            varakozikDontesre: false,
            uzenet: "",
            uzenetTipus: ""
        };
    }
    return session.poker;
}

//?Csak a frontendnek szükséges (biztonságos) adatok visszaadása
function biztonsagosAllapot(jatek) {
    // Az ellenfél lapjait és a paklit SOHA nem küldjük el, csak játék végén
    var ellenfelLapok = jatek.jatekVege ? jatek.kez2 : null;

    // Asztal lapjai: játék végén az összeset, egyébként csak a felfordítottakat küldjük
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

    // Játékos kéz kiértékelése
    var felfordított = [];
    for (var i = 0; i < jatek.felforditottDb; i++) felfordított.push(jatek.oszto[i]);
    var jatekosEredmeny = jatek.kez.length === 2 ? kiert(jatek.kez, felfordított) : { ertek: 0, nev: "–" };

    // Ellenfél kéz kiértékelése (csak játék végén)
    var ellenfelEredmeny = null;
    if (jatek.jatekVege && jatek.kez2.length === 2) {
        ellenfelEredmeny = kiert(jatek.kez2, jatek.oszto);
    }

    return {
        jatekosZseton: jatek.jatekosZseton,
        ellenfelZseton: jatek.ellenfelZseton,
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

//?POST /api/poker/uj – Új leosztás indítása
router.post('/poker/uj', (req, res) => {
    var jatek = getJatek(req.session);

    // Pakli keverés és kártyák kiosztása
    jatek.pakli = pakliLetrehozas();
    jatek.kez = [jatek.pakli.pop(), jatek.pakli.pop()];
    jatek.kez2 = [jatek.pakli.pop(), jatek.pakli.pop()];
    jatek.oszto = [];
    for (var i = 0; i < 5; i++) jatek.oszto.push(jatek.pakli.pop());

    jatek.felforditottDb = 0;
    jatek.jatekVege = false;
    jatek.uzenet = "";
    jatek.uzenetTipus = "";

    // Vakok befizetése
    var kisVak = NAGYVAK / 2;
    jatek.jatekosZseton -= kisVak;
    jatek.ellenfelZseton -= NAGYVAK;
    jatek.pot = kisVak + NAGYVAK;
    jatek.aktualisTet = 0;
    jatek.varakozikDontesre = true;

    res.json(biztonsagosAllapot(jatek));
});

//?GET /api/poker/allapot – Aktuális állapot lekérdezése
router.get('/poker/allapot', (req, res) => {
    var jatek = getJatek(req.session);
    res.json(biztonsagosAllapot(jatek));
});

//?POST /api/poker/check – Játékos passzol
router.post('/poker/check', (req, res) => {
    var jatek = getJatek(req.session);
    if (jatek.jatekVege || !jatek.varakozikDontesre) {
        return res.status(400).json({ hiba: "Nem lehet most passzolni." });
    }
    if (jatek.aktualisTet > 0) {
        return res.status(400).json({ hiba: "Van aktív tét, nem lehet passzolni." });
    }

    jatek.aktualisTet = 0;
    jatek.varakozikDontesre = false;

    // Ellenfél dönt
    var aiDontes = ellenfelAI(jatek.kez2, jatek.oszto, jatek.felforditottDb, jatek.aktualisTet);
    vegrehajtEllenfelet(jatek, aiDontes);

    res.json(biztonsagosAllapot(jatek));
});

//?POST /api/poker/call – Játékos tartja a tétet
router.post('/poker/call', (req, res) => {
    var jatek = getJatek(req.session);
    if (jatek.jatekVege || !jatek.varakozikDontesre) {
        return res.status(400).json({ hiba: "Nem lehet most tartani." });
    }
    if (jatek.aktualisTet <= 0) {
        return res.status(400).json({ hiba: "Nincs aktív tét amit tartani kellene." });
    }

    var osszeg = Math.min(jatek.aktualisTet, jatek.jatekosZseton);
    jatek.jatekosZseton -= osszeg;
    jatek.pot += osszeg;
    jatek.aktualisTet = 0;
    jatek.varakozikDontesre = false;

    // Következő fázis (új lapok)
    kovetkezoFazis(jatek);

    res.json(biztonsagosAllapot(jatek));
});

//?POST /api/poker/raise – Játékos emel
router.post('/poker/raise', (req, res) => {
    var jatek = getJatek(req.session);
    if (jatek.jatekVege || !jatek.varakozikDontesre) {
        return res.status(400).json({ hiba: "Nem lehet most emelni." });
    }

    var hivas = jatek.aktualisTet;
    var emeles = NAGYVAK;
    var osszeg = hivas + emeles;
    if (osszeg > jatek.jatekosZseton) osszeg = jatek.jatekosZseton;

    jatek.jatekosZseton -= osszeg;
    jatek.pot += osszeg;
    jatek.aktualisTet = emeles;
    jatek.varakozikDontesre = false;

    // Ellenfél dönt az emelésre
    var aiDontes = ellenfelAI(jatek.kez2, jatek.oszto, jatek.felforditottDb, jatek.aktualisTet);
    vegrehajtEllenfelet(jatek, aiDontes);

    res.json(biztonsagosAllapot(jatek));
});

//?POST /api/poker/fold – Játékos bedobja
router.post('/poker/fold', (req, res) => {
    var jatek = getJatek(req.session);
    if (jatek.jatekVege || !jatek.varakozikDontesre) {
        return res.status(400).json({ hiba: "Nem lehet most bedobni." });
    }

    jatek.jatekVege = true;
    jatek.varakozikDontesre = false;
    jatek.ellenfelZseton += jatek.pot;
    jatek.pot = 0;
    jatek.uzenet = "❌ Bedobtad a lapjaid!";
    jatek.uzenetTipus = "vesztett";

    res.json(biztonsagosAllapot(jatek));
});

// ----------------------------------------------------------
//!               PÓKER BELSŐ SEGÉDFÜGGVÉNYEK
// ----------------------------------------------------------

//?Ellenfél AI döntés végrehajtása
function vegrehajtEllenfelet(jatek, dontes) {
    if (dontes === "check") {
        jatek.uzenet = "Ellenfél: Passz (Check)";
        jatek.uzenetTipus = "";
        kovetkezoFazis(jatek);

    } else if (dontes === "call") {
        var osszeg = Math.min(jatek.aktualisTet, jatek.ellenfelZseton);
        jatek.ellenfelZseton -= osszeg;
        jatek.pot += osszeg;
        jatek.aktualisTet = 0;
        jatek.uzenet = "Ellenfél: Tartás (Call) – " + osszeg + " 💰";
        jatek.uzenetTipus = "";
        kovetkezoFazis(jatek);

    } else if (dontes === "raise") {
        var emeles = NAGYVAK;
        if (jatek.ellenfelZseton < emeles) emeles = jatek.ellenfelZseton;
        jatek.ellenfelZseton -= emeles;
        jatek.pot += emeles;
        jatek.aktualisTet = emeles;
        jatek.uzenet = "Ellenfél: Emelés (Raise) – " + emeles + " 💰";
        jatek.uzenetTipus = "";
        // Játékosnak kell válaszolnia az emelésre
        jatek.varakozikDontesre = true;

    } else if (dontes === "fold") {
        jatek.jatekosZseton += jatek.pot;
        jatek.pot = 0;
        jatek.jatekVege = true;
        jatek.uzenet = "🏆 Az ellenfél bedobta!";
        jatek.uzenetTipus = "nyert";
    }
}

//?Következő fázis (flop/turn/river/showdown)
function kovetkezoFazis(jatek) {
    if (jatek.jatekVege) return;

    if (jatek.felforditottDb < 5) {
        if (jatek.felforditottDb === 0) jatek.felforditottDb = 3;  // Flop
        else jatek.felforditottDb++;                                // Turn / River

        if (jatek.felforditottDb === 5) {
            // Showdown
            jatek.jatekVege = true;
            showdown(jatek);
        } else {
            // Következő tét-kör
            jatek.aktualisTet = 0;
            jatek.varakozikDontesre = true;
        }
    } else {
        jatek.jatekVege = true;
        showdown(jatek);
    }
}

//?Showdown – nyertes meghatározása és pot kiosztása
function showdown(jatek) {
    var jatekosEredmeny = kiert(jatek.kez, jatek.oszto);
    var ellenfelEredmeny = kiert(jatek.kez2, jatek.oszto);

    var nyertes = null;
    if (jatekosEredmeny.ertek > ellenfelEredmeny.ertek) {
        nyertes = "jatekos";
    } else if (jatekosEredmeny.ertek < ellenfelEredmeny.ertek) {
        nyertes = "ellenfel";
    } else {
        if (jatekosEredmeny.maxLap > ellenfelEredmeny.maxLap) nyertes = "jatekos";
        else if (jatekosEredmeny.maxLap < ellenfelEredmeny.maxLap) nyertes = "ellenfel";
        else nyertes = "dontetlen";
    }

    if (nyertes === "jatekos") {
        jatek.uzenet = "🏆 Te nyertél! +" + jatek.pot + " 💰";
        jatek.uzenetTipus = "nyert";
        jatek.jatekosZseton += jatek.pot;
    } else if (nyertes === "ellenfel") {
        jatek.uzenet = "❌ Az ellenfél nyert! -" + jatek.pot + " 💰";
        jatek.uzenetTipus = "vesztett";
        jatek.ellenfelZseton += jatek.pot;
    } else {
        jatek.uzenet = "🤝 Döntetlen! Tét visszaosztva.";
        jatek.uzenetTipus = "dontetlen";
        jatek.jatekosZseton += jatek.pot / 2;
        jatek.ellenfelZseton += jatek.pot / 2;
    }

    jatek.pot = 0;
}

module.exports = router;
