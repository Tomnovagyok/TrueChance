document.addEventListener('DOMContentLoaded', function () {

    // Szerver kommunikációs függvény
    const Fetch = async (url, method = 'GET', body = null) => {
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-type': 'application/json' },
                body: body ? JSON.stringify(body) : null
            });

            if (!response.ok) {
                throw new Error('Hiba: ' + response.statusText);
            }

            return await response.json();
        } catch (error) {
            throw new Error('Hiba: ' + error.message);
        }
    };

    // Rulett kerék konstansok
    const szamokSzama = 37;
    const fokSzeletenkent = 360 / szamokSzama;

    // A piros szín számok a rulett keréken
    const pirosszamok = [32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12, 3];

    // Számok sorrendje a rulett keréken
    const kereksorrend = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

    const MAX_SZAM_FOGADAS_DB = 16;

    // Állapotváltozók
    let egyenleg = 0;
    let aktualisTet = 10;
    let forogMost = false;
    let aktualisRotacio = 0;
    let elozoKorTet = null;

    // HTML elemek referenciái
    const kerekElem = document.getElementById('rouletteKerek');
    const porgetesBtnElem = document.getElementById('porgetesBtnElem');
    const eredmenyKijelzo = document.getElementById('eredmenyKijelzo');
    const eredmenySzam = document.getElementById('eredmenySzam');
    const tetOsszegInput = document.getElementById('tetOsszegInput');
    const kivalasztottTetSzoveg = document.getElementById('kivalasztottTetSzoveg');
    const infoPanelTet = document.getElementById('infoPanelTet');
    const infoPanelUtolso = document.getElementById('infoPanelUtolso');
    const infoPanelEgyenleg = document.getElementById('infoPanelEgyenleg');
    const porgetesHistoryLista = document.getElementById('porgetesHistoryLista');
    const tetSzekcio = document.querySelector('.tet-szekcio');
    const osszesTetLevetelBtn = document.getElementById('osszesTetLevetelBtn');
    const elozoTetUjraBtn = document.getElementById('elozoTetUjraBtn');
    const aktualisKorOsszTet = document.getElementById('aktualisKorOsszTet');
    const statsToggleBtn = document.getElementById('statsToggleBtn');

    const statisztikaAdatok = {
        houseEdge: '2.7%',
        roi: '-2.7%'
    };

    const sessionStatisztika = {
        nyertKorok: 0,
        vesztettKorok: 0,
        utolsoKorProfit: 0
    };

    // Egyenleg megjelenítése
    infoPanelEgyenleg.innerHTML = '$' + egyenleg;
    kijelzesFrissites();
    egyenlegBetolt();
    setStatisztikaVisible(false);

    function frissitEgyenlegKijelzo() {
        infoPanelEgyenleg.innerHTML = '$' + egyenleg;

        const navbarEgyenleg = document.getElementById('navbarEgyenleg');
        if (navbarEgyenleg) {
            navbarEgyenleg.textContent = '$' + egyenleg;
        }
    }

    async function egyenlegBetolt() {
        try {
            const felhasznalo = await Fetch('/api/auth/me');
            const egyenlegErtek = parseFloat(felhasznalo.egyenleg);

            if (!isNaN(egyenlegErtek)) {
                egyenleg = egyenlegErtek;
                frissitEgyenlegKijelzo();

                kijelzesFrissites();
            }
        } catch (error) {
            console.error('Egyenleg betöltési hiba:', error);
        }
    }

    const gyorsGombok = document.querySelectorAll('.tet-gyors-gomb');
    for (let gombIndex = 0; gombIndex < gyorsGombok.length; gombIndex++) {
        const gomb = gyorsGombok[gombIndex];
        gomb.addEventListener('click', function () {
            aktualisTet = parseInt(this.dataset.ertek);
            tetOsszegInput.value = aktualisTet;
            kijelzesFrissites();
        });
    }

    tetOsszegInput.addEventListener('input', function () {
        const ertek = parseInt(this.value);
        if (!isNaN(ertek) && ertek > 0) {
            aktualisTet = ertek;
            kijelzesFrissites();
        }
    });

    function tetOsszegBemenetekLetiltasa(letiltva) {
        tetOsszegInput.disabled = letiltva;
        for (let index = 0; index < gyorsGombok.length; index++) {
            gyorsGombok[index].disabled = letiltva;
        }
    }

    const osszesGomb = tetSzekcio.querySelectorAll('.szam-gomb, .sor-gomb, .also-gomb');

    for (let gombIndex = 0; gombIndex < osszesGomb.length; gombIndex++) {
        const gomb = osszesGomb[gombIndex];
        gomb.dataset.tet = 'false';

        gomb.addEventListener('click', function () {
            // Pörgetés közben nem lehet változtatni
            if (forogMost) {
                return;
            }

            const tipus = this.dataset.tipus;
            const marKivalasztott = this.dataset.tet === 'true';

            if (marKivalasztott) {
                this.dataset.tet = 'false';
                this.classList.remove('kivalasztott');
                kijelzesFrissites();
                return;
            }

            // Maximum 16 külön szám fogadás
            if (tipus === 'szam' && szamFogadasDbSzamol() >= MAX_SZAM_FOGADAS_DB) {
                eredmenyUzenetMutat('Maximum 16 számra fogadhatsz egyszerre.', 'vesztett');
                return;
            }

            // Új fogadás felvétele
            this.dataset.tet = 'true';
            this.classList.add('kivalasztott');
            kijelzesFrissites();
        });
    }

    if (osszesTetLevetelBtn) {
        osszesTetLevetelBtn.addEventListener('click', function () {
            if (forogMost) {
                return;
            }
            osszesTetLevetel();
        });
    }

    if (elozoTetUjraBtn) {
        elozoTetUjraBtn.addEventListener('click', function () {
            elozoTetUjraRakasa();
        });
    }

    if (statsToggleBtn) {
        statsToggleBtn.addEventListener('click', function (event) {
            event.preventDefault();
            toggleStatisztika();
        });
    }

    porgetesBtnElem.addEventListener('click', async function () {
        const kivalasztottFogadasok = getKivalasztottFogadasok();
        const spinElottiEgyenleg = egyenleg;
        const elozetesOsszTet = aktualisTet * kivalasztottFogadasok.length;

        if (forogMost) {
            return;
        }
        if (kivalasztottFogadasok.length === 0) {
            return;
        }

        if (spinElottiEgyenleg < elozetesOsszTet) {
            eredmenyUzenetMutat('Nincs elég egyenleged!', 'vesztett');
            return;
        }

        elozoTetElment(kivalasztottFogadasok, aktualisTet);
        forogMost = true;
        tetOsszegBemenetekLetiltasa(true);

        // Frontenden a tétet már spin indításkor levonjuk (megelőlegezzük),
        // így a felhasználó azonnal látja a csökkenést.
        egyenleg = spinElottiEgyenleg - elozetesOsszTet;
        frissitEgyenlegKijelzo();
        kijelzesFrissites();

        try {
            // Pörgetés kérés küldése a szervernek
            const adat = await Fetch('/api/roulette/spin', 'POST', {
                tet: aktualisTet,
                fogadasok: kivalasztottFogadasok
            });

            const kiszorsoltSzam = adat.szam;
            const nyert = adat.nyert;
            const nyeremeny = adat.nyeremeny;
            const osszTet = adat.osszTet;

            // Szám pozíciójának kiszámítása a keréken
            let szamIndex = 0;
            for (let index = 0; index < kereksorrend.length; index++) {
                if (kereksorrend[index] === kiszorsoltSzam) {
                    szamIndex = index;
                    break;
                }
            }

            let szamKozepFok = 0;
            if (szamIndex === 0) {
                szamKozepFok = 0;
            } else {
                szamKozepFok = 360 - szamIndex * fokSzeletenkent;
            }

            // Jelenlegi rotáció normalizálása
            const normalizaltRotacio = ((aktualisRotacio % 360) + 360) % 360;

            // Szükséges elfordulás kiszámítása
            let szuksegesElfordulas = szamKozepFok - normalizaltRotacio;
            if (szuksegesElfordulas <= 0) {
                szuksegesElfordulas = szuksegesElfordulas + 360;
            }

            // Teljes körök száma (3-5 között)
            const teljesKorok = Math.floor(Math.random() * 3) + 3;
            const celFok = aktualisRotacio + teljesKorok * 360 + szuksegesElfordulas;

            // Kerék forgatása
            kerekElem.classList.add('forog');
            kerekElem.style.transform = 'rotate(' + celFok + 'deg)';

            // Pörgetés befejezése után
            setTimeout(function () {
                aktualisRotacio = celFok;
                kerekElem.classList.remove('forog');

                // Egyenleg és session stat frissítés csak akkor, amikor a kerék megállt
                egyenleg = adat.egyenleg;
                frissitEgyenlegKijelzo();

                frissitSessionStatisztika(nyert, nyeremeny, osszTet);

                // Eredmény megjelenítése
                eredmenyMegjelenit(kiszorsoltSzam);
                historyHozzaad(kiszorsoltSzam);

                // Üzenet megjelenítése
                if (nyert) {
                    eredmenyUzenetMutat('Nyertél! +$' + nyeremeny, 'nyert');
                } else {
                    eredmenyUzenetMutat('Vesztettél! -$' + osszTet, 'vesztett');
                }

                // Minden spin után minden tét levétele
                osszesTetLevetel();
                forogMost = false;
                tetOsszegBemenetekLetiltasa(false);
                kijelzesFrissites();
            }, 4000);
        } catch (error) {
            // Sikertelen spin esetén visszaállítjuk a spin előtti egyenleget.
            egyenleg = spinElottiEgyenleg;
            frissitEgyenlegKijelzo();
            eredmenyUzenetMutat(error.message, 'vesztett');
            forogMost = false;
            tetOsszegBemenetekLetiltasa(false);
            kijelzesFrissites();
        }
    });

    function getKivalasztottFogadasok() {
        const fogadasok = [];
        const aktivGombok = tetSzekcio.querySelectorAll(
            '.szam-gomb[data-tet="true"], .sor-gomb[data-tet="true"], .also-gomb[data-tet="true"]'
        );

        for (let index = 0; index < aktivGombok.length; index++) {
            const gomb = aktivGombok[index];
            fogadasok.push({
                tipus: gomb.dataset.tipus,
                ertek: gomb.dataset.ertek
            });
        }

        return fogadasok;
    }

    function szamFogadasDbSzamol() {
        return tetSzekcio.querySelectorAll('.szam-gomb[data-tet="true"]').length;
    }

    function osszesTetLevetel() {
        const aktivGombok = tetSzekcio.querySelectorAll(
            '.szam-gomb[data-tet="true"], .sor-gomb[data-tet="true"], .also-gomb[data-tet="true"]'
        );

        for (let index = 0; index < aktivGombok.length; index++) {
            const gomb = aktivGombok[index];
            gomb.dataset.tet = 'false';
            gomb.classList.remove('kivalasztott');
        }

        kijelzesFrissites();
    }

    function osszTetKiszamol() {
        const kivalasztottFogadasok = getKivalasztottFogadasok();
        return aktualisTet * kivalasztottFogadasok.length;
    }

    function elozoTetElment(fogadasok, tetOsszeg) {
        const masoltFogadasok = [];
        for (let index = 0; index < fogadasok.length; index++) {
            masoltFogadasok.push({
                tipus: fogadasok[index].tipus,
                ertek: fogadasok[index].ertek
            });
        }

        elozoKorTet = {
            tetOsszeg: tetOsszeg,
            fogadasok: masoltFogadasok
        };
    }

    function elozoTetUjraRakasa() {
        if (forogMost || !elozoKorTet || !elozoKorTet.fogadasok || elozoKorTet.fogadasok.length === 0) {
            return;
        }

        osszesTetLevetel();
        aktualisTet = elozoKorTet.tetOsszeg;
        tetOsszegInput.value = aktualisTet;

        for (let index = 0; index < elozoKorTet.fogadasok.length; index++) {
            const fogadas = elozoKorTet.fogadasok[index];
            const gomb = tetSzekcio.querySelector(
                '[data-tipus="' + fogadas.tipus + '"][data-ertek="' + fogadas.ertek + '"]'
            );

            if (!gomb) {
                continue;
            }

            gomb.dataset.tet = 'true';
            gomb.classList.add('kivalasztott');
        }

        kijelzesFrissites();
    }

    function kijelzesFrissites() {
        const kivalasztottFogadasok = getKivalasztottFogadasok();
        const osszesitettTet = osszTetKiszamol();

        if (kivalasztottFogadasok.length === 0) {
            kivalasztottTetSzoveg.innerHTML = 'Nincs kiválasztva';
        } else {
            const fogadasSzovegek = [];
            for (let index = 0; index < kivalasztottFogadasok.length; index++) {
                const fogadas = kivalasztottFogadasok[index];
                fogadasSzovegek.push(getTetSzoveg(fogadas.tipus, fogadas.ertek));
            }

            kivalasztottTetSzoveg.innerHTML = fogadasSzovegek.join(', ');
        }

        infoPanelTet.innerHTML = '$' + osszesitettTet;
        if (aktualisKorOsszTet) {
            aktualisKorOsszTet.textContent = '$' + osszesitettTet;
        }

        const nincsEgyenleg = egyenleg <= 0;
        porgetesBtnElem.disabled = forogMost || kivalasztottFogadasok.length === 0 || nincsEgyenleg;
        if (elozoTetUjraBtn) {
            const nincsElozoTet = !elozoKorTet || !elozoKorTet.fogadasok || elozoKorTet.fogadasok.length === 0;
            elozoTetUjraBtn.disabled = forogMost || nincsElozoTet;
        }

        frissitStatisztikak(kivalasztottFogadasok);
    }

    function fogadasEllenorzes(szam, tipus, ertek) {
        if (tipus === 'szam') {
            return szam === parseInt(ertek);
        }

        if (tipus === 'szin') {
            if (szam === 0) {
                return false;
            }

            const pirosE = pirosszamok.includes(szam);
            if (ertek === 'piros') {
                return pirosE;
            }
            return !pirosE;
        }

        if (tipus === 'paros') {
            if (szam === 0) {
                return false;
            }

            const parosE = szam % 2 === 0;
            if (ertek === 'paros') {
                return parosE;
            }
            return !parosE;
        }

        if (tipus === 'tartomany') {
            if (szam === 0) {
                return false;
            }

            if (ertek === 'also') {
                return szam <= 18;
            }
            return szam >= 19;
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

    function fogadasNyeroSzamok(fogadas) {
        const nyeroSzamok = new Set();
        if (!fogadas) {
            return nyeroSzamok;
        }

        for (let szam = 0; szam <= 36; szam++) {
            if (fogadasEllenorzes(szam, fogadas.tipus, fogadas.ertek)) {
                nyeroSzamok.add(szam);
            }
        }

        return nyeroSzamok;
    }

    function szamolOsszesTetEgyszerreEsely(fogadasok) {
        if (!fogadasok || fogadasok.length === 0) {
            return 0;
        }

        let metszet = null;

        for (let index = 0; index < fogadasok.length; index++) {
            const nyeroSzamok = fogadasNyeroSzamok(fogadasok[index]);

            if (metszet === null) {
                metszet = new Set(nyeroSzamok);
                continue;
            }

            const ujMetszet = new Set();
            metszet.forEach(function (szam) {
                if (nyeroSzamok.has(szam)) {
                    ujMetszet.add(szam);
                }
            });
            metszet = ujMetszet;

            if (metszet.size === 0) {
                break;
            }
        }

        return ((metszet ? metszet.size : 0) / 37) * 100;
    }

    function szamolAltalanosNyeresiEsely(fogadasok) {
        if (!fogadasok || fogadasok.length === 0) {
            return 0;
        }

        const unio = new Set();

        for (let index = 0; index < fogadasok.length; index++) {
            const nyeroSzamok = fogadasNyeroSzamok(fogadasok[index]);
            nyeroSzamok.forEach(function (szam) {
                unio.add(szam);
            });
        }

        return (unio.size / 37) * 100;
    }

    function formatSzazalek(ertek) {
        if (ertek === null || ertek === undefined || isNaN(ertek)) {
            return '0.0%';
        }

        return `${ertek.toFixed(1)}%`;
    }

    function formatPenz(ertek) {
        if (ertek === null || ertek === undefined || isNaN(ertek)) {
            return '$0.00';
        }

        const abs = Math.abs(ertek).toFixed(2);
        if (ertek > 0) {
            return `+$${abs}`;
        }
        if (ertek < 0) {
            return `-$${abs}`;
        }
        return '$0.00';
    }

    function frissitSessionStatisztika(nyert, nyeremeny, osszTet) {
        if (nyert) {
            sessionStatisztika.nyertKorok = sessionStatisztika.nyertKorok + 1;
        } else {
            sessionStatisztika.vesztettKorok = sessionStatisztika.vesztettKorok + 1;
        }

        const nyeremenySzam = Number(nyeremeny) || 0;
        const osszTetSzam = Number(osszTet) || 0;
        sessionStatisztika.utolsoKorProfit = nyeremenySzam - osszTetSzam;
    }

    function frissitStatisztikak(kivalasztottFogadasok) {
        const fogadasok = kivalasztottFogadasok || getKivalasztottFogadasok();
        const osszesTetEsely = szamolOsszesTetEgyszerreEsely(fogadasok);
        const altalanosNyeresiEsely = szamolAltalanosNyeresiEsely(fogadasok);

        const allWinEl = document.getElementById('stat-all-win');
        const anyWinEl = document.getElementById('stat-any-win');
        const houseEl = document.getElementById('stat-house');
        const roiEl = document.getElementById('stat-roi');
        const winLossEl = document.getElementById('stat-winloss');
        const roundProfitEl = document.getElementById('stat-round-profit');

        if (allWinEl) {
            allWinEl.textContent = `Esély: ${formatSzazalek(osszesTetEsely)}`;
        }

        if (anyWinEl) {
            anyWinEl.textContent = `Esély: ${formatSzazalek(altalanosNyeresiEsely)}`;
        }

        if (houseEl) {
            houseEl.textContent = `Statikus ház előny: ${statisztikaAdatok.houseEdge}`;
        }

        if (roiEl) {
            roiEl.textContent = `Statikus ROI: ${statisztikaAdatok.roi}`;
        }

        if (winLossEl) {
            winLossEl.textContent = `Session Win/Loss: ${sessionStatisztika.nyertKorok}/${sessionStatisztika.vesztettKorok}`;
        }

        if (roundProfitEl) {
            roundProfitEl.textContent = `Körprofit: ${formatPenz(sessionStatisztika.utolsoKorProfit)}`;
        }
    }

    function setStatisztikaVisible(visible) {
        const panel = document.getElementById('statisztikaPanel');
        const kontener = document.querySelector('.roulette-kontener');
        const gomb = document.getElementById('statsToggleBtn');
        if (!panel || !kontener || !gomb) {
            return;
        }

        if (visible) {
            panel.classList.add('visible');
            kontener.classList.add('statisztika-aktiv');
            gomb.classList.add('active');
        } else {
            panel.classList.remove('visible');
            kontener.classList.remove('statisztika-aktiv');
            gomb.classList.remove('active');
        }

        frissitStatisztikak(getKivalasztottFogadasok());
    }

    function toggleStatisztika() {
        const kontener = document.querySelector('.roulette-kontener');
        if (!kontener) {
            return;
        }

        const aktiv = kontener.classList.contains('statisztika-aktiv');
        setStatisztikaVisible(!aktiv);
    }

    // Eredmény megjelenítése a kijelzőn
    function eredmenyMegjelenit(szam) {
        eredmenySzam.innerHTML = szam;
        infoPanelUtolso.innerHTML = szam;

        // Kijelző háttérszínének beállítása
        eredmenyKijelzo.classList.remove('piros', 'fekete', 'zold');
        eredmenyKijelzo.classList.add(getSzamSzin(szam));
    }

    function getSzamSzin(szam) {
        const szamGomb = document.querySelector('.szam-gomb[data-tipus="szam"][data-ertek="' + szam + '"]');

        // A színt a fogadási táblából vesszük
        if (szamGomb) {
            if (szamGomb.classList.contains('zold')) {
                return 'zold';
            }
            if (szamGomb.classList.contains('piros')) {
                return 'piros';
            }
            return 'fekete';
        }

        if (szam === 0) {
            return 'zold';
        }

        for (let index = 0; index < pirosszamok.length; index++) {
            if (pirosszamok[index] === szam) {
                return 'piros';
            }
        }

        return 'fekete';
    }

    function historyHozzaad(szam) {
        if (!porgetesHistoryLista) {
            return;
        }

        const historyElem = document.createElement('span');
        historyElem.classList.add('history-szam');
        historyElem.classList.add(getSzamSzin(szam));
        historyElem.innerHTML = szam;

        porgetesHistoryLista.insertBefore(historyElem, porgetesHistoryLista.firstChild);

        while (porgetesHistoryLista.scrollWidth > porgetesHistoryLista.clientWidth && porgetesHistoryLista.lastElementChild) {
            porgetesHistoryLista.removeChild(porgetesHistoryLista.lastElementChild);
        }
    }

    // Fogadás szövegének generálása
    function getTetSzoveg(tipus, ertek) {
        if (tipus === 'szam') {
            return ertek + '. szám';
        }

        if (tipus === 'szin') {
            if (ertek === 'piros') {
                return 'Piros';
            } else {
                return 'Fekete';
            }
        }

        if (tipus === 'paros') {
            if (ertek === 'paros') {
                return 'Páros';
            } else {
                return 'Páratlan';
            }
        }

        if (tipus === 'tartomany') {
            if (ertek === 'also') {
                return '1-18';
            } else {
                return '19-36';
            }
        }

        if (tipus === 'tucat') {
            if (ertek === '1') {
                return '1. tucat (1-12)';
            }
            if (ertek === '2') {
                return '2. tucat (13-24)';
            }
            if (ertek === '3') {
                return '3. tucat (25-36)';
            }
        }

        if (tipus === 'sor') {
            if (ertek === '1') {
                return '1. sor (1, 4, 7...)';
            }
            if (ertek === '2') {
                return '2. sor (2, 5, 8...)';
            }
            if (ertek === '3') {
                return '3. sor (3, 6, 9...)';
            }
        }

        return 'Ismeretlen';
    }

    // Eredmény üzenet megjelenítése
    function eredmenyUzenetMutat(szoveg, tipus) {
        // Régi üzenet eltávolítása
        const regi = document.querySelector('.eredmeny-uzenet');
        if (regi) {
            regi.remove();
        }

        // Új üzenet létrehozása
        const uzenet = document.createElement('div');
        uzenet.classList.add('eredmeny-uzenet', tipus);
        uzenet.innerHTML = szoveg;
        document.body.appendChild(uzenet);

        // Megjelenítés animációval
        setTimeout(function () {
            uzenet.classList.add('latszik');
        }, 100);

        // Eltűntetés időzítés
        setTimeout(function () {
            uzenet.classList.remove('latszik');
            setTimeout(function () {
                uzenet.remove();
            }, 350);
        }, 2000);
    }
});
