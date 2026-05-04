// Póker játék backend logika: kérkiértékelés, AI ellenfél, API végpontok
const express = require('express');
const router = express.Router();
const database = require('../sql/database.js');


// PÓKER BACKEND - A teljes játéklogika szerver oldalon fut.

// Kártya adatok
var SZAMOK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
var SZIMBOLUMOK = ['Pikk', 'Treff', 'Káró', 'Kör'];
var ERTEKEK = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
var NAGYVAK = 50;

// Pakli létrehozása és Fisher-Yates keverés
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

// Kéz kíértékelő: meghatározza a legjobb 5 lapos kéz erősségét (0=magas lap, 10=royal flöss)
// A póker kéz kiértékelő fő függvénye. Megkapja a játékos 2 lapját és az asztalon lévő (akár 5) lapot, majd meghatározza a legerősebb 5 lapos kombinációt.
// Visszatér egy objektummal, ami tartalmazza a kombináció erejét (ertek: 0-10), nevét és a döntetlen esetén használatos kísérőlapokat.
function kiert(jatekosKez, asztalLapok) {
    var aktivLapok = [jatekosKez[0], jatekosKez[1]];
    for (var i = 0; i < asztalLapok.length; i++) aktivLapok.push(asztalLapok[i]);

    var szamSzamlalo = {};
    for (var i = 0; i < aktivLapok.length; i++) {
        var ertek = aktivLapok[i].ertek;
        szamSzamlalo[ertek] = (szamSzamlalo[ertek] || 0) + 1;
    }

    var egyediErtekek = Object.keys(szamSzamlalo)
        .map(function (kulcs) {
            return Number(kulcs);
        })
        .sort(function (a, b) {
            return b - a;
        });

    // Segédfüggvény: megkeresi a legmagasabb sorozatot (5 egymást követő lap) az adott értékekből.
    // Kezeli az ászt (14) alacsonyként is (1), ha A-2-3-4-5 sorról van szó.
    function legmagasabbSor(ertekek) {
        var ertekLista = ertekek.slice();
        if (ertekLista.indexOf(14) !== -1) {
            ertekLista.push(1);
        }
        ertekLista.sort(function (a, b) {
            return a - b;
        });

        var egyedi = [];
        for (var i = 0; i < ertekLista.length; i++) {
            if (egyedi.indexOf(ertekLista[i]) === -1) {
                egyedi.push(ertekLista[i]);
            }
        }

        var sorDb = 1;
        var legmagasabb = 0;
        for (var i = 1; i < egyedi.length; i++) {
            if (egyedi[i] === egyedi[i - 1] + 1) {
                sorDb++;
                if (sorDb >= 5) {
                    legmagasabb = egyedi[i];
                }
            } else {
                sorDb = 1;
            }
        }

        return legmagasabb;
    }

    // Segédfüggvény: Kikerüli a már felhasznált lapokat (kizarvaLista), 
    // és visszaadja a maradék lapokból a legnagyobbakat, amik a "kicker" (kísérő) szerepét töltik be.
    function legmagasabbKiserok(kizarvaLista, darab) {
        var kiserok = [];
        for (var i = 0; i < egyediErtekek.length; i++) {
            var ertek = egyediErtekek[i];
            if (kizarvaLista.indexOf(ertek) !== -1) {
                continue;
            }
            kiserok.push(ertek);
            if (kiserok.length >= darab) {
                break;
            }
        }
        return kiserok;
    }

    // Segédfüggvény: Két kísérőlap-lista (tieBreaker) összehasonlítása azonos erősségű kezek esetén.
    // Sorban halad végig a lapokon (a legnagyobbtól a legkisebbig), és ha talál különbséget, eldönti a nyertest.
    function tieBreakerOsszehasonlit(elso, masodik) {
        var maxHossz = Math.max(elso.length, masodik.length);
        for (var i = 0; i < maxHossz; i++) {
            var elsoErtek = i < elso.length ? elso[i] : 0;
            var masodikErtek = i < masodik.length ? masodik[i] : 0;

            if (elsoErtek > masodikErtek) {
                return 1;
            }
            if (elsoErtek < masodikErtek) {
                return -1;
            }
        }

        return 0;
    }

    // 1. LÉPÉS: Megszámoljuk a párokat, drill-eket (3 azonos) és póker-eket (4 azonos)
    var negyesek = [];
    var harmasok = [];
    var parok = [];
    for (var i = 0; i < egyediErtekek.length; i++) {
        var ertek = egyediErtekek[i];
        var db = szamSzamlalo[ertek];
        if (db === 4) {
            negyesek.push(ertek);
        } else if (db === 3) {
            harmasok.push(ertek);
        } else if (db === 2) {
            parok.push(ertek);
        }
    }

    // 2. LÉPÉS: Flöss (szín) ellenőrzése
    // Csoportosítjuk a lapokat szín (szimbolum) szerint.
    var szinSzerintiErtekek = {};
    for (var i = 0; i < aktivLapok.length; i++) {
        var lap = aktivLapok[i];
        if (!szinSzerintiErtekek[lap.szimbolum]) {
            szinSzerintiErtekek[lap.szimbolum] = [];
        }
        szinSzerintiErtekek[lap.szimbolum].push(lap.ertek);
    }

    var legerosebbFloss = [];
    var legerosebbSzinSor = 0;
    for (var szin in szinSzerintiErtekek) {
        var ertekek = szinSzerintiErtekek[szin];
        if (ertekek.length < 5) {
            continue;
        }

        var rendezett = ertekek.slice().sort(function (a, b) {
            return b - a;
        });
        if (tieBreakerOsszehasonlit(rendezett.slice(0, 5), legerosebbFloss) > 0) {
            legerosebbFloss = rendezett.slice(0, 5);
        }

        var sorMagasLapFlossben = legmagasabbSor(rendezett);
        if (sorMagasLapFlossben > legerosebbSzinSor) {
            legerosebbSzinSor = sorMagasLapFlossben;
        }
    }

    // 3. LÉPÉS: A kezek kiértékelése a legerősebbtől a leggyengébbig haladva.
    
    // Royal Flöss / Színsor
    // Ha van egy sorunk, ami egyben flöss is (legerosebbSzinSor):
    if (legerosebbSzinSor >= 14) {
        return {
            ertek: 10,
            nev: 'Royal flöss',
            tieBreaker: [14],
            maxLap: 14,
            masodikLap: 0
        };
    }

    if (legerosebbSzinSor > 0) {
        return {
            ertek: 9,
            nev: 'Szín Sor',
            tieBreaker: [legerosebbSzinSor],
            maxLap: legerosebbSzinSor,
            masodikLap: 0
        };
    }

    // Póker (4 azonos lap)
    if (negyesek.length > 0) {
        var pokerErtek = negyesek[0];
        var pokerKisero = legmagasabbKiserok([pokerErtek], 1);
        return {
            ertek: 8,
            nev: 'Póker',
            tieBreaker: [pokerErtek].concat(pokerKisero),
            maxLap: pokerErtek,
            masodikLap: pokerKisero[0] || 0
        };
    }

    // Full House (1 drill + 1 pár)
    if (harmasok.length > 0) {
        var fullHarom = harmasok[0];
        var fullParJeloltek = [];

        for (var i = 0; i < harmasok.length; i++) {
            if (harmasok[i] !== fullHarom) {
                fullParJeloltek.push(harmasok[i]);
            }
        }
        for (var i = 0; i < parok.length; i++) {
            fullParJeloltek.push(parok[i]);
        }
        fullParJeloltek.sort(function (a, b) {
            return b - a;
        });

        if (fullParJeloltek.length > 0) {
            return {
                ertek: 7,
                nev: 'Full House',
                tieBreaker: [fullHarom, fullParJeloltek[0]],
                maxLap: fullHarom,
                masodikLap: fullParJeloltek[0]
            };
        }
    }

    // Flöss (5 egyszínű lap)
    if (legerosebbFloss.length > 0) {
        return {
            ertek: 6,
            nev: 'Flöss',
            tieBreaker: legerosebbFloss,
            maxLap: legerosebbFloss[0] || 0,
            masodikLap: legerosebbFloss[1] || 0
        };
    }

    // Sor (5 egymást követő lap, nem egyező szín)
    var sorMagasLap = legmagasabbSor(egyediErtekek);
    if (sorMagasLap > 0) {
        return {
            ertek: 5,
            nev: 'Sor',
            tieBreaker: [sorMagasLap],
            maxLap: sorMagasLap,
            masodikLap: 0
        };
    }

    // Drill (3 azonos lap)
    if (harmasok.length > 0) {
        var drillErtek = harmasok[0];
        var drillKiserok = legmagasabbKiserok([drillErtek], 2);
        return {
            ertek: 4,
            nev: 'Drill',
            tieBreaker: [drillErtek].concat(drillKiserok),
            maxLap: drillErtek,
            masodikLap: drillKiserok[0] || 0
        };
    }

    // Két Pár
    if (parok.length >= 2) {
        var ketParMagas = parok[0];
        var ketParAlacsony = parok[1];
        var ketParKisero = legmagasabbKiserok([ketParMagas, ketParAlacsony], 1);
        return {
            ertek: 3,
            nev: 'Két Pár',
            tieBreaker: [ketParMagas, ketParAlacsony].concat(ketParKisero),
            maxLap: ketParMagas,
            masodikLap: ketParAlacsony
        };
    }

    // Egy Pár
    if (parok.length === 1) {
        var parErtek = parok[0];
        var parKiserok = legmagasabbKiserok([parErtek], 3);
        return {
            ertek: 2,
            nev: 'Pár',
            tieBreaker: [parErtek].concat(parKiserok),
            maxLap: parErtek,
            masodikLap: parKiserok[0] || 0
        };
    }

    // Magas Lap (ha semmi sem jött be, a legmagasabb lap dönt)
    var magasLapok = egyediErtekek.slice(0, 5);
    return {
        ertek: 0,
        nev: 'Magas lap',
        tieBreaker: magasLapok,
        maxLap: magasLapok[0] || 0,
        masodikLap: magasLapok[1] || 0
    };
}

// Két kez kiértékelési eredmény összehasonlítása; holtverseny esetén kísérők döntenek
function nyertesMeghatarozas(jatekosEredmeny, ellenfelEredmeny) {
    if (jatekosEredmeny.ertek > ellenfelEredmeny.ertek) {
        return 'jatekos';
    }
    if (jatekosEredmeny.ertek < ellenfelEredmeny.ertek) {
        return 'ellenfel';
    }

    var jatekosTieBreaker = jatekosEredmeny.tieBreaker || [];
    var ellenfelTieBreaker = ellenfelEredmeny.tieBreaker || [];
    var maxHossz = Math.max(jatekosTieBreaker.length, ellenfelTieBreaker.length);

    for (var i = 0; i < maxHossz; i++) {
        var jatekosErtek = i < jatekosTieBreaker.length ? jatekosTieBreaker[i] : 0;
        var ellenfelErtek = i < ellenfelTieBreaker.length ? ellenfelTieBreaker[i] : 0;

        if (jatekosErtek > ellenfelErtek) {
            return 'jatekos';
        }
        if (jatekosErtek < ellenfelErtek) {
            return 'ellenfel';
        }
    }

    return 'dontetlen';
}

// Monte Carlo-stílusú szimulációval kíszámolja a játék statikus nyerési arányát és ROI-ját
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

// Az eredményt cachelni (elment) egyszer számolja ki; szerver újtíndításig érvényes
var pokerStatikaCache = null;

function statikusPokerAdatok() {
    // Csak első hiváskor számolja ki, utána a cachet adja vissza
    if (!pokerStatikaCache) {
        pokerStatikaCache = pokerStatikusMutatokSzimulacioval(8000);
    }
    return pokerStatikaCache;
}

// Ellenfél döntés
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

// Session-ből visszaadja az aktív játékállapotot; ha még nincs, egy üres alapstruktúrát hoz létre
function getJatek(session) {
    if (!session.poker) {
        // Alapértelmezett játékállapot – minden új sessioniés játékélesnél ezzel indul
        session.poker = {
            jatekosZseton: 0,      // játékos egyenlege a körben
            pot: 0,                // a közepre betétett penz
            aktualisTet: 0,       // az aktíu, válaszra váró tét
            kez: [],              // játékos két lapja
            kez2: [],             // ellenfél két lapja
            oszto: [],            // asztali 5 lap
            pakli: [],            // maradék pakli
            felforditottDb: 0,    // hány asztali lap van felfordítva (0, 3, 4 vagy 5)
            jatekVege: false,
            varakozikDontesre: false,
            bloff: false,         // az ellenfél blöff módban van-e
            uzenet: '',
            uzenetTipus: '',
            jatekosOsszesBetje: 0, // a játékos ebben a körben összes betete
            utolsoNyertPot: 0,   // ha az ellenfél dob, ide mentjük a kiosztott potot a naplózáshoz
            aktiv: false,
            ellenfelTartottMar: false,  // tartott-e már az ellenfél
            ellenfelEmeltMar: false,    // emelt-e már az ellenfél
            utolsoJatekosEmelesArany: 0, // az utolsó emelés aránya az egyenleghez képest
            jatekosAllIn: false,         // elfogyott a játékos pénze
            riverCheckDb: 0              // egymás utáni checkek száma a riveren
        };
    }
    return session.poker;
}

// Csak a frontendnek szükséges adatok visszaadása
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

// Póker api végpontok:

// GET /api/poker/statisztika – Sztatikus szimulált mutatók
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

// POST /api/poker/uj – Új leosztás indítása
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
        jatek.utolsoNyertPot = 0;
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
        jatek.riverCheckDb = 0;

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

// GET /api/poker/allapot – Aktuális állapot lekérdezése
router.get('/poker/allapot', (req, res) => {
    var jatek = getJatek(req.session);
    res.json(biztonsagosAllapot(jatek));
});

// POST /api/poker/check – Játékos passzol
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
    jatek.riverCheckDb = (jatek.riverCheckDb || 0) + 1;

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
            var nyertPot = Number.isFinite(jatek.utolsoNyertPot) ? jatek.utolsoNyertPot : jatek.pot;
            var nyeremeny = nyertPot - jatekosOsszesBet;
            await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);
            await database.jatekmentNaploz(req.session.felhasznaloId, 'poker', jatekosOsszesBet, nyeremeny, jatek.jatekosZseton);
            jatek.jatekosOsszesBetje = 0;
            jatek.utolsoNyertPot = 0;
        } catch (error) {
            console.error('Poker ellenfél fold rögzítés hiba:', error);
        }
    }

    // Ha a játék még nem vége, következő fázis
    if (!jatek.jatekVege && !jatek.varakozikDontesre) {
        await kovetkezoFazis(jatek, req.session.felhasznaloId);
    } else if (req.session.felhasznaloId && jatek.uzenetTipus !== 'nyert') {
        // Játék vége, de nem fold (showdown volt már rögzítve)
        await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);
    }

    res.json(biztonsagosAllapot(jatek));
});

// POST /api/poker/call – Játékos tartja a tétet
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
        jatek.riverCheckDb = 0;
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
                var nyertPot = Number.isFinite(jatek.utolsoNyertPot) ? jatek.utolsoNyertPot : jatek.pot;
                var nyeremeny = nyertPot - jatekosOsszesBet;
                await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);
                await database.jatekmentNaploz(req.session.felhasznaloId, 'poker', jatekosOsszesBet, nyeremeny, jatek.jatekosZseton);
                jatek.jatekosOsszesBetje = 0;
                jatek.utolsoNyertPot = 0;
            } catch (error) {
                console.error('Poker ellenfél fold rögzítés hiba:', error);
            }
        }

        // Ha a játék még nem vége, következő fázis
        if (!jatek.jatekVege && !jatek.varakozikDontesre) {
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

// POST /api/poker/raise – Játékos emel
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
    jatek.riverCheckDb = 0;
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
            var nyertPot = Number.isFinite(jatek.utolsoNyertPot) ? jatek.utolsoNyertPot : jatek.pot;
            var nyeremeny = nyertPot - jatekosOsszesBet;
            await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);
            await database.jatekmentNaploz(req.session.felhasznaloId, 'poker', jatekosOsszesBet, nyeremeny, jatek.jatekosZseton);
            jatek.jatekosOsszesBetje = 0;
            jatek.utolsoNyertPot = 0;
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

// POST /api/poker/fold – Játékos bedobja a lapjait
router.post('/poker/fold', async (req, res) => {
    var jatek = getJatek(req.session);
    if (jatek.jatekVege || !jatek.varakozikDontesre) {
        return res.status(400).json({ hiba: 'Nem lehet most bedobni.' });
    }

    // A pot nullázódik, mert az ellenfél nem volt bedobva, de következőt vonjuk
    jatek.jatekVege = true;
    jatek.varakozikDontesre = false;
    jatek.pot = 0; // az ellenfél nyeri a potot, mi semmit nem kapunk vissza
    jatek.uzenet = '❌ Bedobtad a lapjaid!';
    jatek.uzenetTipus = 'vesztett';
    jatek.utolsoNyertPot = 0;

    // Adatbázis frissítés: egyenleg és játékmenet naplózása
    if (req.session.felhasznaloId) {
        try {
            await database.egyenlegFrissit(req.session.felhasznaloId, jatek.jatekosZseton);

            var jatekosOsszesBet = jatek.jatekosOsszesBetje;
            jatek.jatekosOsszesBetje = 0; // kör végén nullazás
            // A nyerémény és bet megegyeznek negativan: -jatekosOsszesBet jelent a teljes vesztéseget
            await database.jatekmentNaploz(req.session.felhasznaloId, 'poker', jatekosOsszesBet, -jatekosOsszesBet, jatek.jatekosZseton);
        } catch (error) {
            console.error('Poker fold hiba:', error);
        }
    }

    res.json(biztonsagosAllapot(jatek));
});

// Póker belső segédfüggvények:

// Ellenfél AI döntés végrehajtása
function vegrehajtEllenfelet(jatek, dontes) {
    if (dontes === 'check') {
        jatek.uzenet = 'Ellenfél: Passz (Check)';
        jatek.uzenetTipus = '';
        jatek.riverCheckDb = (jatek.riverCheckDb || 0) + 1;
        // Ne hívd meg itt a kovetkezoFazis-t, az az endpoint végzi
    } else if (dontes === 'call') {
        jatek.pot += jatek.aktualisTet;
        jatek.aktualisTet = 0;
        jatek.uzenet = 'Ellenfél: Tartás (Call) 💰';
        jatek.uzenetTipus = '';
        jatek.riverCheckDb = 0;
        jatek.ellenfelTartottMar = true;
        // Ne hívd meg itt a kovetkezoFazis-t, az az endpoint végzi
    } else if (dontes === 'raise') {
        // Előbb kifizeti a meglévő tétet, majd NAGYVAK-kal emel
        if (jatek.jatekosAllIn) {
            jatek.pot += jatek.aktualisTet;
            jatek.aktualisTet = 0;
            jatek.uzenet = 'Ellenfél: Tartás (Call) 💰';
            jatek.uzenetTipus = '';
            jatek.riverCheckDb = 0;
            jatek.ellenfelTartottMar = true;
            return;
        }
        jatek.pot += jatek.aktualisTet;
        jatek.pot += NAGYVAK;
        jatek.aktualisTet = NAGYVAK;
        jatek.uzenet = 'Ellenfél: Emelés (Raise) 💰';
        jatek.uzenetTipus = '';
        jatek.riverCheckDb = 0;
        jatek.ellenfelTartottMar = true;
        jatek.ellenfelEmeltMar = true;
        // Játékosnak kell válaszolnia az emelésre
        jatek.varakozikDontesre = true;
    } else if (dontes === 'fold') {
        var nyertPot = jatek.pot;
        jatek.jatekosZseton += nyertPot;
        jatek.utolsoNyertPot = nyertPot;
        jatek.pot = 0;
        jatek.jatekVege = true;
        jatek.uzenet = '🏆 Az ellenfél bedobta!';
        jatek.uzenetTipus = 'nyert';
        jatek.riverCheckDb = 0;
    }
}

// Következő fázis (flop/turn/river/showdown)
async function kovetkezoFazis(jatek, felhasznaloId) {
    if (jatek.jatekVege) return;

    if (jatek.felforditottDb < 5) {
        if (jatek.felforditottDb === 0)
            jatek.felforditottDb = 3; // Flop
        else jatek.felforditottDb++; // Turn / River

        // Következő tét-kör (river után is)
        jatek.aktualisTet = 0;
        jatek.varakozikDontesre = true;
        jatek.riverCheckDb = 0;
    } else {
        // Riveren addig mehet a kör, amíg nincs két egymás utáni check
        if ((jatek.riverCheckDb || 0) >= 2) {
            jatek.jatekVege = true;
            await showdown(jatek, felhasznaloId);
        } else {
            jatek.aktualisTet = 0;
            jatek.varakozikDontesre = true;
        }
    }
}

async function allInAzonnaliShowdown(jatek, felhasznaloId) {
    jatek.felforditottDb = 5;
    jatek.aktualisTet = 0;
    jatek.varakozikDontesre = false;
    jatek.riverCheckDb = 0;
    jatek.jatekVege = true;
    await showdown(jatek, felhasznaloId);
}

// Showdown – nyertes meghatározása és pot kiosztása
async function showdown(jatek, felhasznaloId) {
    jatek.utolsoNyertPot = 0;
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
        // Nettó nyeremény: a pot mínusz amit a játékos maga fizetett be
        nyeremeny = jatek.pot - jatekosOsszesBet;
    } else if (nyertes === 'ellenfel') {
        jatek.uzenet = '❌ Az ellenfél nyert! -' + jatek.pot + ' 💰';
        jatek.uzenetTipus = 'vesztett';
        ujEgyenleg = jatek.jatekosZseton;
        // Nettó veszteség: csak annyi, amit a játékos befizetett
        nyeremeny = -jatekosOsszesBet;
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
