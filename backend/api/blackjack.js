const express = require('express');
const router = express.Router();
const database = require('../sql/database.js');

const szamok = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const szimbolumok = ['Pikk', 'Treff', 'Káró', 'Kör'];
const ertekek = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];

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
        jatekosKez_Double: false,
        jatekosKez2_Double: false,
        isSplit: false,
        status: 'init',
        eredmeny: 'Állapot: várakozás'
    };
}

// GET /api/blackjack/user - Felhasználó adatok (egyenleg)
router.get('/user', async (request, response) => {
    try {
        if (!request.session.felhasznaloId) {
            return response.status(401).json({ error: 'Nincs bejelentkezve' });
        }
        const felhasznalo = await database.felhasznaloIdAltal(request.session.felhasznaloId);
        if (!felhasznalo) {
            return response.status(404).json({ error: 'Felhasználó nem található' });
        }
        response.status(200).json({
            egyenleg: felhasznalo.egyenleg,
            nev: felhasznalo.nev
        });
    } catch (error) {
        response.status(500).json({ error: 'Felhasználó lekérése sikertelen' });
    }
});

// POST /api/blackjack/init - Új játék indítása
router.post('/init', async (request, response) => {
    try {
        if (!request.session.felhasznaloId) {
            return response.status(401).json({ error: 'Nincs bejelentkezve' });
        }

        const { tet } = request.body;

        if (!tet || tet <= 0) {
            return response.status(400).json({ error: 'Érvényes tétet kell megadni' });
        }

        const felhasznalo = await database.felhasznaloIdAltal(request.session.felhasznaloId);
        if (!felhasznalo) {
            return response.status(404).json({ error: 'Felhasználó nem található' });
        }

        const egyenlegNum = parseFloat(felhasznalo.egyenleg) || 0;
        if (egyenlegNum < tet) {
            return response.status(400).json({ error: 'Nincs elég egyenleg a téthez' });
        }

        const ujEgyenleg = egyenlegNum - tet;
        await database.egyenlegFrissit(request.session.felhasznaloId, ujEgyenleg);

        const game = Játék_Inicializálás();
        game.tet = tet;
        game.levontTet = tet; // Mennyi lett eddig levonva
        game.kezdoEgyenleg = egyenlegNum; // Eredeti egyenleg a játék előtt

        // Kezdeti lapok osztása: játékos 2 lap, osztó 2 lap
        game.jatekosKez.push(game.deck.pop());
        game.osztoKez.push(game.deck.pop());
        game.jatekosKez.push(game.deck.pop());
        game.osztoKez.push(game.deck.pop());

        game.status = 'ongoing';
        game.eredmeny = 'Állapot: osztva';

        const jatekosPont = kezErtek(game.jatekosKez);
        const isBlackjack = jatekosPont === 21;

        request.session.blackjackGame = game;

        const canAffordDouble = ujEgyenleg >= tet;

        response.status(200).json({
            jatekosKez: game.jatekosKez,
            osztoKez: game.osztoKez,
            jatekosKez2: game.jatekosKez2,
            osztoRejtett: true,
            kezIndex: 1,
            pakliMaradek: game.deck.length,
            eredmeny: game.eredmeny,
            status: game.status,
            canSplit: game.jatekosKez[0].szam === game.jatekosKez[1].szam && canAffordDouble,
            canDouble: game.jatekosKez.length === 2 && canAffordDouble,
            bust: false,
            tet: game.tet,
            ujEgyenleg: ujEgyenleg,
            isBlackjack: isBlackjack
        });
    } catch (error) {
        console.error('Init error:', error);
        response.status(500).json({ error: 'Játék inicializálása sikertelen' });
    }
});

// POST /api/blackjack/hit - Lap kérés
router.post('/hit', (request, response) => {
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
            // 21 lett split esetén: átváltás a második kézre (vagy vége)
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
            // Besokalt: ha split volt, átváltás, különben vége
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
            canDouble: game.kezIndex === 1 ? game.jatekosKez.length === 2 : game.jatekosKez2.length === 2,
            bust: ertek > 21 && !switchHand,
            tet: game.tet
        });
    } catch (error) {
        response.status(500).json({ error: 'Lap kérés sikertelen' });
    }
});

// POST /api/blackjack/double - Duplázás (Double Down)
router.post('/double', async (request, response) => {
    try {
        const game = request.session.blackjackGame;
        if (!game) {
            return response.status(400).json({ error: 'Nincs aktív játék' });
        }

        if (!request.session.felhasznaloId) {
            return response.status(401).json({ error: 'Nincs bejelentkezve' });
        }

        const aktualKez = game.kezIndex === 1 ? game.jatekosKez : game.jatekosKez2;
        if (aktualKez.length !== 2) {
            return response.status(400).json({ error: 'Double csak 2 lapnál lehet' });
        }

        // Egyenleg ellenőrzés és levonás
        const felhasznalo = await database.felhasznaloIdAltal(request.session.felhasznaloId);
        const egyenlegNum = parseFloat(felhasznalo.egyenleg) || 0;
        if (egyenlegNum < game.tet) {
            return response.status(400).json({ error: 'Nincs elég egyenleg a double-hoz' });
        }

        const ujEgyenleg = egyenlegNum - game.tet;
        await database.egyenlegFrissit(request.session.felhasznaloId, ujEgyenleg);
        game.levontTet += game.tet; // Összes levont tét növelése

        if (game.kezIndex === 1) {
            game.jatekosKez_Double = true;
        } else {
            game.jatekosKez2_Double = true;
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

        // Ellenőrizzük, hogy van-e elég egyenleg a második kéz double-jához
        const canAffordDouble = ujEgyenleg >= game.tet;

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
            canDouble: (game.kezIndex === 1 ? game.jatekosKez.length === 2 : game.jatekosKez2.length === 2) && canAffordDouble,
            bust: ertek > 21 && !switchHand,
            tet: game.tet,
            ujEgyenleg: ujEgyenleg,
            levontTet: game.levontTet
        });
    } catch (error) {
        console.error('Double error:', error);
        response.status(500).json({ error: 'Double sikertelen' });
    }
});

// POST /api/blackjack/split - Kéz kettéosztása (Split)
// Ha a játékos első két lapja megegyező értékű, kettéválaszthatja őket.
// A tét megduplázódik, és mindkét kéz kap egy-egy új lapot. A játékos először az egyik, majd a másik kezével játszik.
router.post('/split', async (request, response) => {
    try {
        const game = request.session.blackjackGame;
        if (!game) {
            return response.status(400).json({ error: 'Nincs aktív játék' });
        }

        if (!request.session.felhasznaloId) {
            return response.status(401).json({ error: 'Nincs bejelentkezve' });
        }

        if (game.jatekosKez.length !== 2) {
            return response.status(400).json({ error: 'Split csak 2 lapnál lehet' });
        }

        if (!(game.jatekosKez[0].szam === 'A' && game.jatekosKez[1].szam === 'A') && game.jatekosKez[0].szam !== game.jatekosKez[1].szam) {
            return response.status(400).json({ error: 'A lapok nem egyforma értékűek' });
        }

        // Egyenleg ellenőrzés és levonás
        const felhasznalo = await database.felhasznaloIdAltal(request.session.felhasznaloId);
        const egyenlegNum = parseFloat(felhasznalo.egyenleg) || 0;
        if (egyenlegNum < game.tet) {
            return response.status(400).json({ error: 'Nincs elég egyenleg a split-hez' });
        }

        // Plusz tét levonása a második kézért
        const ujEgyenleg = egyenlegNum - game.tet;
        await database.egyenlegFrissit(request.session.felhasznaloId, ujEgyenleg);
        game.levontTet += game.tet; // Összes levont tét növelése
        game.isSplit = true; // Jelöljük, hogy split történt

        // 3. Az eredeti 2 lap szétválasztása: az 1. lap marad az 1. kéznél, a 2. lap megy a 2. kézhez
        game.jatekosKez2.push(game.jatekosKez[1]);
        game.jatekosKez.pop();

        // 4. Mindkét kéz kap egy-egy új lapot
        game.jatekosKez.push(game.deck.pop());
        game.jatekosKez2.push(game.deck.pop());

        game.kezIndex = 1;
        game.eredmeny = 'Állapot: Split - Első kéz';

        request.session.blackjackGame = game;

        // Ellenőrizzük, hogy van-e elég egyenleg double-hoz
        const canAffordDouble = ujEgyenleg >= game.tet;

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
            canDouble: game.jatekosKez.length === 2 && canAffordDouble,
            bust: false,
            tet: game.tet,
            ujEgyenleg: ujEgyenleg,
            levontTet: game.levontTet
        });
    } catch (error) {
        console.error('Split error:', error);
        response.status(500).json({ error: 'Split sikertelen' });
    }
});

// POST /api/blackjack/stand - Megállás és osztó húzása
// A játékos nem kér több lapot; az osztó 17-ig húz, majd dönt az eredmény
router.post('/stand', async (request, response) => {
    try {
        const game = request.session.blackjackGame;
        if (!game) {
            return response.status(400).json({ error: 'Nincs aktív játék' });
        }

        if (!request.session.felhasznaloId) {
            return response.status(401).json({ error: 'Nincs bejelentkezve' });
        }

        // Egyenleg lekérése double ellenőrzéshez
        const felhasznaloForDouble = await database.felhasznaloIdAltal(request.session.felhasznaloId);
        const canAffordDouble = (parseFloat(felhasznaloForDouble.egyenleg) || 0) >= game.tet;

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
                canDouble: game.jatekosKez2.length === 2 && canAffordDouble,
                bust: false,
                tet: game.tet
            });
        }

        // Osztó felfedi a lapjait
        game.osztoRejtett = false;

        // 2. Osztó húz 17-ig (a szabály szerint az osztónak kötelező megállnia 17-nél)
        while (kezErtek(game.osztoKez) < 17) {
            game.osztoKez.push(game.deck.pop());
        }

        // Eredmények kiszámítása
        const jatekosPont = kezErtek(game.jatekosKez);
        const jatekosPont2 = game.jatekosKez2.length ? kezErtek(game.jatekosKez2) : 0;
        const osztoPont = kezErtek(game.osztoKez);

        let eredmeny = '';
        let eredmeny2 = '';
        let nyeremeny = 0;

        // Blackjack csak az első 2 lapból jöhet létre, és split után nem számít annak
        const isBlackjack = jatekosPont === 21 && game.jatekosKez.length === 2 && !game.isSplit;

        // Az első kéz tétje (double esetén dupla)
        const kez1Tet = game.jatekosKez_Double ? game.tet * 2 : game.tet;
        // A második kéz tétje (ha van, double esetén dupla)
        const kez2Tet = game.jatekosKez2.length > 0 ? (game.jatekosKez2_Double ? game.tet * 2 : game.tet) : 0;

        // Első kéz eredménye
        if (isBlackjack) {
            // Blackjack: 2.5x kifizetés
            eredmeny = 'BLACKJACK!';
            nyeremeny += Math.floor(game.tet * 2.5);
        } else if (game.jatekosKez_Nyert) {
            eredmeny = 'Nyertél (21)';
            nyeremeny += kez1Tet * 2;
        } else if (jatekosPont > 21) {
            eredmeny = 'Vesztettél';
            // Nincs nyeremény
        } else if (osztoPont > 21) {
            eredmeny = 'Nyertél';
            nyeremeny += kez1Tet * 2;
        } else if (jatekosPont > osztoPont) {
            eredmeny = 'Nyertél';
            nyeremeny += kez1Tet * 2;
        } else if (jatekosPont < osztoPont) {
            eredmeny = 'Vesztettél';
            // Nincs nyeremény
        } else {
            eredmeny = 'Döntetlen';
            nyeremeny += kez1Tet; // Visszakapja a tétjét
        }

        // Második kéz eredménye (ha van split)
        if (game.jatekosKez2.length > 0) {
            if (game.jatekosKez2_Nyert) {
                eredmeny2 = ' | Nyertél (21)';
                nyeremeny += kez2Tet * 2;
            } else if (jatekosPont2 > 21) {
                eredmeny2 = ' | Vesztettél';
                // Nincs nyeremény
            } else if (osztoPont > 21) {
                eredmeny2 = ' | Nyertél';
                nyeremeny += kez2Tet * 2;
            } else if (jatekosPont2 > osztoPont) {
                eredmeny2 = ' | Nyertél';
                nyeremeny += kez2Tet * 2;
            } else if (jatekosPont2 < osztoPont) {
                eredmeny2 = ' | Vesztettél';
                // Nincs nyeremény
            } else {
                eredmeny2 = ' | Döntetlen';
                nyeremeny += kez2Tet; // Visszakapja a tétjét
            }
        }

        game.status = 'gameover';
        game.eredmeny = 'Állapot: ' + eredmeny + eredmeny2;
        request.session.blackjackGame = game;

        // Egyenleg frissítése - a tét már le lett vonva, csak a nyereményt adjuk hozzá
        const felhasznalo = await database.felhasznaloIdAltal(request.session.felhasznaloId);
        const regiEgyenleg = parseFloat(felhasznalo.egyenleg) || 0;
        const ujEgyenleg = regiEgyenleg + nyeremeny;

        await database.egyenlegFrissit(request.session.felhasznaloId, ujEgyenleg);

        await database.jatekmentNaploz(
            request.session.felhasznaloId,
            'blackjack',
            game.levontTet, // Az összes levont tét
            nyeremeny,
            ujEgyenleg
        );

        response.status(200).json({
            jatekosKez: game.jatekosKez,
            osztoKez: game.osztoKez,
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
            bust: false,
            tet: game.tet,
            nyeremeny: nyeremeny,
            ujEgyenleg: ujEgyenleg,
            isBlackjack: isBlackjack
        });
    } catch (error) {
        console.error('Stand error:', error);
        response.status(500).json({ error: 'Stand sikertelen' });
    }
});

module.exports = router;
