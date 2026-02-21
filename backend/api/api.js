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

//! ==================== BLACKJACK Függvények ====================

// Kártya adatok
const szamok = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const szimbolumok = ['Pikk', 'Treff', 'Káró', 'Kör'];
const ertekek = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];

// Pakli létrehozása és keverése
function PakliLetrehozasEsKeveres() {
    let pakli = [];
    for (let i = 0; i < szimbolumok.length; i++) {
        for (let j = 0; j < szamok.length; j++) {
            pakli.push({
                szimbolum: szimbolumok[i],
                szam: szamok[j],
                ertek: ertekek[j]
            });
        }
    }
    // Fisher-Yates shuffle
    for (let k = pakli.length - 1; k > 0; k--) {
        const rand = Math.floor(Math.random() * (k + 1));
        const temp = pakli[k];
        pakli[k] = pakli[rand];
        pakli[rand] = temp;
    }
    return pakli;
}

// Kéz értékének kiszámítása
function kezErtek(kezek) {
    let osszeg = 0;
    let aszDb = 0;
    for (let i = 0; i < kezek.length; i++) {
        osszeg += kezek[i].ertek;
        if (kezek[i].szam === 'A') aszDb++;
    }
    while (osszeg > 21 && aszDb > 0) {
        osszeg -= 10;
        aszDb--;
    }
    return osszeg;
}

// Játék inicializálása
function Játék_Inicializálás() {
    return {
        deck: PakliLetrehozasEsKeveres(),
        jatekosKez: [],
        osztoKez: [],
        jatekosKez2: [],
        osztoRejtett: true,
        kezIndex: 1,
        jatekosKez_Nyert: false,
        jatekosKez2_Nyert: false,
        status: 'init',
        eredmeny: 'Állapot: várakozás'
    };
}

//! ==================== BLACKJACK Függvények VÉGE ====================

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

//?----------------------------------------------------------------------------------------------------

//! ==================== BLACKJACK Végpontok ====================

//?POST /api/game/init - Új játék indítása
router.post('/game/init', (request, response) => {
    try {
        const game = Játék_Inicializálás();

        // Kezdeti lapok osztása: játékos 2 lap, osztó 2 lap
        game.jatekosKez.push(game.deck.pop());
        game.osztoKez.push(game.deck.pop());
        game.jatekosKez.push(game.deck.pop());
        game.osztoKez.push(game.deck.pop());

        game.status = 'ongoing';
        game.eredmeny = 'Állapot: osztva';

        // Session-ben tárolni a game state-et
        request.session.blackjackGame = game;

        response.status(200).json({
            jatekosKez: game.jatekosKez,
            osztoKez: game.osztoKez, // Teljes osztoKez, a frontend dönti el mit mutat
            jatekosKez2: game.jatekosKez2,
            osztoRejtett: true,
            kezIndex: 1,
            pakliMaradek: game.deck.length,
            eredmeny: game.eredmeny,
            status: game.status,
            canSplit: game.jatekosKez[0].szam === game.jatekosKez[1].szam,
            canDouble: game.jatekosKez.length === 2,
            bust: false
        });
    } catch (error) {
        response.status(500).json({ error: 'Játék inicializálása sikertelen' });
    }
});

//?POST /api/game/hit - Lap kérés
router.post('/game/hit', (request, response) => {
    try {
        const game = request.session.blackjackGame;
        if (!game) {
            return response.status(400).json({ error: 'Nincs aktív játék' });
        }

        const aktualKez = game.kezIndex === 1 ? game.jatekosKez : game.jatekosKez2;
        aktualKez.push(game.deck.pop());

        const ertek = kezErtek(aktualKez);
        let canContinue = true;
        let switchHand = false;

        if (ertek === 21 && game.jatekosKez2.length > 0) {
            if (game.kezIndex === 1) {
                game.jatekosKez_Nyert = true;
                game.eredmeny = 'Állapot: Első kéz 21 - Második kéz';
                game.kezIndex = 2;
                switchHand = true;
            } else {
                game.jatekosKez2_Nyert = true;
                canContinue = false;
            }
        } else if (ertek > 21) {
            game.eredmeny = 'Állapot: Az aktuális kézzel besokaltál';
            if (game.jatekosKez2.length > 0 && game.kezIndex === 1) {
                game.kezIndex = 2;
                game.eredmeny = 'Állapot: Split - Második kéz';
                switchHand = true;
            } else {
                canContinue = false;
            }
        }

        request.session.blackjackGame = game;

        response.status(200).json({
            jatekosKez: game.jatekosKez,
            osztoKez: game.osztoKez,
            jatekosKez2: game.jatekosKez2,
            osztoRejtett: true,
            kezIndex: game.kezIndex,
            pakliMaradek: game.deck.length,
            eredmeny: game.eredmeny,
            status: canContinue ? 'ongoing' : 'stand_needed',
            switchHand: switchHand,
            canSplit: false,
            canDouble:
                game.kezIndex === 1 ? game.jatekosKez.length === 2 : game.jatekosKez2.length === 2,
            bust: ertek > 21 && !switchHand
        });
    } catch (error) {
        response.status(500).json({ error: 'Lap kérés sikertelen' });
    }
});

//?POST /api/game/double - Dupla tét
router.post('/game/double', (request, response) => {
    try {
        const game = request.session.blackjackGame;
        if (!game) {
            return response.status(400).json({ error: 'Nincs aktív játék' });
        }

        const aktualKez = game.kezIndex === 1 ? game.jatekosKez : game.jatekosKez2;
        if (aktualKez.length !== 2) {
            return response.status(400).json({ error: 'Double csak 2 lapnál lehet' });
        }

        aktualKez.push(game.deck.pop());
        const ertek = kezErtek(aktualKez);
        let canContinue = true;
        let switchHand = false;

        if (ertek === 21 && game.jatekosKez2.length > 0) {
            if (game.kezIndex === 1) {
                game.jatekosKez_Nyert = true;
                game.eredmeny = 'Állapot: Első kéz 21 - Második kéz';
                game.kezIndex = 2;
                switchHand = true;
            } else {
                game.jatekosKez2_Nyert = true;
                canContinue = false;
            }
        } else if (ertek > 21) {
            game.eredmeny = 'Állapot: Az aktuális kéznél besokaltál';
            if (game.jatekosKez2.length > 0 && game.kezIndex === 1) {
                game.kezIndex = 2;
                game.eredmeny = 'Állapot: Split - Második kéz';
                switchHand = true;
            } else {
                canContinue = false;
            }
        } else if (game.jatekosKez2.length > 0 && game.kezIndex === 1) {
            game.kezIndex = 2;
            game.eredmeny = 'Állapot: Split - Második kéz';
            switchHand = true;
        } else {
            canContinue = false;
        }

        request.session.blackjackGame = game;

        response.status(200).json({
            jatekosKez: game.jatekosKez,
            osztoKez: game.osztoKez,
            jatekosKez2: game.jatekosKez2,
            osztoRejtett: true,
            kezIndex: game.kezIndex,
            pakliMaradek: game.deck.length,
            eredmeny: game.eredmeny,
            status: canContinue ? 'ongoing' : 'stand_needed',
            switchHand: switchHand,
            canSplit: false,
            canDouble:
                game.kezIndex === 1 ? game.jatekosKez.length === 2 : game.jatekosKez2.length === 2,
            bust: ertek > 21 && !switchHand
        });
    } catch (error) {
        response.status(500).json({ error: 'Double sikertelen' });
    }
});

//?POST /api/game/split - Split
router.post('/game/split', (request, response) => {
    try {
        const game = request.session.blackjackGame;
        if (!game) {
            return response.status(400).json({ error: 'Nincs aktív játék' });
        }

        if (game.jatekosKez.length !== 2) {
            return response.status(400).json({ error: 'Split csak 2 lapnál lehet' });
        }

        if (
            !(game.jatekosKez[0].szam === 'A' && game.jatekosKez[1].szam === 'A') &&
            game.jatekosKez[0].szam !== game.jatekosKez[1].szam
        ) {
            return response.status(400).json({ error: 'A lapok nem egyforma értékűek' });
        }

        game.jatekosKez2.push(game.jatekosKez[1]);
        game.jatekosKez.pop();

        game.jatekosKez.push(game.deck.pop());
        game.jatekosKez2.push(game.deck.pop());

        game.kezIndex = 1;
        game.eredmeny = 'Állapot: Split - Első kéz';

        request.session.blackjackGame = game;

        response.status(200).json({
            jatekosKez: game.jatekosKez,
            osztoKez: game.osztoKez,
            jatekosKez2: game.jatekosKez2,
            osztoRejtett: true,
            kezIndex: 1,
            pakliMaradek: game.deck.length,
            eredmeny: game.eredmeny,
            status: 'ongoing',
            switchHand: false,
            canSplit: false,
            canDouble: game.jatekosKez.length === 2,
            bust: false
        });
    } catch (error) {
        response.status(500).json({ error: 'Split sikertelen' });
    }
});

//?POST /api/game/stand - Megállás és osztó húzása
router.post('/game/stand', (request, response) => {
    try {
        const game = request.session.blackjackGame;
        if (!game) {
            return response.status(400).json({ error: 'Nincs aktív játék' });
        }

        // Ha split van és az első keznél vagyunk, váltunk a másodikra
        if (game.jatekosKez2.length > 0 && game.kezIndex === 1) {
            game.kezIndex = 2;
            game.eredmeny = 'Állapot: Split - Második kéz';
            request.session.blackjackGame = game;
            return response.status(200).json({
                jatekosKez: game.jatekosKez,
                osztoKez: game.osztoKez,
                jatekosKez2: game.jatekosKez2,
                osztoRejtett: true,
                kezIndex: 2,
                pakliMaradek: game.deck.length,
                eredmeny: game.eredmeny,
                status: 'ongoing',
                switchHand: true,
                canSplit: false,
                canDouble: game.jatekosKez2.length === 2,
                bust: false
            });
        }

        // Osztó felfedi a lapjait
        game.osztoRejtett = false;

        // Osztó húz 17-ig
        while (kezErtek(game.osztoKez) < 17) {
            game.osztoKez.push(game.deck.pop());
        }

        // Eredmények kiszámítása
        const jatekosPont = kezErtek(game.jatekosKez);
        const jatekosPont2 = game.jatekosKez2.length ? kezErtek(game.jatekosKez2) : 0;
        const osztoPont = kezErtek(game.osztoKez);

        let eredmeny = '';
        let eredmeny2 = '';

        // Első kéz eredménye
        if (game.jatekosKez_Nyert) {
            eredmeny = 'Nyertél (21)';
        } else if (jatekosPont > 21) {
            eredmeny = 'Vesztettél';
        } else if (osztoPont > 21) {
            eredmeny = 'Nyertél';
        } else if (jatekosPont > osztoPont) {
            eredmeny = 'Nyertél';
        } else if (jatekosPont < osztoPont) {
            eredmeny = 'Vesztettél';
        } else {
            eredmeny = 'Döntetlen';
        }

        // Második kéz eredménye (ha van split)
        if (game.jatekosKez2.length > 0) {
            if (game.jatekosKez2_Nyert) {
                eredmeny2 = ' | Nyertél (21)';
            } else if (jatekosPont2 > 21) {
                eredmeny2 = ' | Vesztettél';
            } else if (osztoPont > 21) {
                eredmeny2 = ' | Nyertél';
            } else if (jatekosPont2 > osztoPont) {
                eredmeny2 = ' | Nyertél';
            } else if (jatekosPont2 < osztoPont) {
                eredmeny2 = ' | Vesztettél';
            } else {
                eredmeny2 = ' | Döntetlen';
            }
        }

        game.status = 'gameover';
        game.eredmeny = 'Állapot: ' + eredmeny + eredmeny2;
        request.session.blackjackGame = game;

        response.status(200).json({
            jatekosKez: game.jatekosKez,
            osztoKez: game.osztoKez, // Most már teljes osztó lapok
            jatekosKez2: game.jatekosKez2,
            osztoRejtett: false,
            kezIndex: game.kezIndex,
            jatekosPont: jatekosPont,
            jatekosPont2: jatekosPont2,
            osztoPont: osztoPont,
            pakliMaradek: game.deck.length,
            eredmeny: game.eredmeny,
            status: 'gameover',
            switchHand: false,
            canSplit: false,
            canDouble: false,
            bust: false
        });
    } catch (error) {
        response.status(500).json({ error: 'Stand sikertelen' });
    }
});

module.exports = router;
