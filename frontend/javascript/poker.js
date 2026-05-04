document.addEventListener('DOMContentLoaded', function () {
    // DOM elemek
    const checkBtn = document.getElementById('checkBtn');
    const callBtn = document.getElementById('callBtn');
    const raiseBtn = document.getElementById('raiseBtn');
    const foldBtn = document.getElementById('foldBtn');
    const resetBtn = document.getElementById('resetBtn');
    const raiseSlider = document.getElementById('raiseSlider');
    const raiseInput = document.getElementById('raiseInput');
    const egyenlegMutato = document.getElementById('egyenlegMutato');
    const statsToggleBtn = document.getElementById('statsToggleBtn');

    // Játékos egyenleg – kezdetben betöltődik az adatbázisból
    let jatekosEgyenleg = 0;

    const statisztikaAdatok = {
        statikusHouseEdge: '0.0%',
        statikusRoi: '0.0%'
    };

    // A session alatti statisztikát (hány kört nyert, mennyi profitot termelt) a frontend
    // a backend válaszaiból maga is számolja és frissíti a UI-n.
    const sessionStatisztika = {
        korok: 0,
        nyertKorok: 0,
        vesztettKorok: 0,
        dontetlenKorok: 0,
        kezdoEgyenleg: null,
        sessionProfit: 0,
        elozoJatekVege: null
    };

    let statisztikaKeresFolyamatban = false;
    let statisztikaUjraKereseSzukseges = false;

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

    function formatSzazalek(ertek) {
        if (ertek === null || ertek === undefined || isNaN(ertek)) {
            return '0.0%';
        }
        return Number(ertek).toFixed(1) + '%';
    }

    function formatPenz(ertek) {
        if (ertek === null || ertek === undefined || isNaN(ertek)) {
            return '$0.00';
        }

        const abs = Math.abs(Number(ertek)).toFixed(2);
        if (ertek > 0) {
            return '+$' + abs;
        }
        if (ertek < 0) {
            return '-$' + abs;
        }
        return '$0.00';
    }

    function szamolSessionWinrate() {
        if (sessionStatisztika.korok === 0) {
            return '0.0%';
        }
        return ((sessionStatisztika.nyertKorok / sessionStatisztika.korok) * 100).toFixed(1) + '%';
    }

    function frissitPokerStatisztikak() {
        const sessionWinLossEl = document.getElementById('stat-session-winloss');
        const sessionWinrateEl = document.getElementById('stat-session-winrate');
        const sessionRoundsEl = document.getElementById('stat-session-rounds');
        const sessionProfitEl = document.getElementById('stat-session-profit');
        const houseEdgeEl = document.getElementById('stat-house-edge');
        const roiEl = document.getElementById('stat-roi');

        if (sessionWinLossEl) {
            sessionWinLossEl.textContent =
                'Session Win/Loss/Draw: ' +
                sessionStatisztika.nyertKorok +
                '/' +
                sessionStatisztika.vesztettKorok +
                '/' +
                sessionStatisztika.dontetlenKorok;
        }
        if (sessionWinrateEl) {
            sessionWinrateEl.textContent = 'Session győzelmi arány: ' + szamolSessionWinrate();
        }
        if (sessionRoundsEl) {
            sessionRoundsEl.textContent = 'Session körök: ' + sessionStatisztika.korok;
        }
        if (sessionProfitEl) {
            sessionProfitEl.textContent = 'Session profit: ' + formatPenz(sessionStatisztika.sessionProfit);
        }
        if (houseEdgeEl) {
            houseEdgeEl.textContent = 'Szimulált ház előny: ' + statisztikaAdatok.statikusHouseEdge;
        }
        if (roiEl) {
            roiEl.textContent = 'Szimulált ROI: ' + statisztikaAdatok.statikusRoi;
        }
    }

    function frissitSessionStatisztika(adat) {
        let aktualisEgyenleg = Number(adat.jatekosZseton);
        if (isNaN(aktualisEgyenleg)) {
            aktualisEgyenleg = 0;
        }

        if (sessionStatisztika.kezdoEgyenleg === null) {
            sessionStatisztika.kezdoEgyenleg = aktualisEgyenleg;
        }
        sessionStatisztika.sessionProfit = aktualisEgyenleg - sessionStatisztika.kezdoEgyenleg;

        const jatekVegeMost = !!adat.jatekVege;
        if (sessionStatisztika.elozoJatekVege === null) {
            sessionStatisztika.elozoJatekVege = jatekVegeMost;
            return;
        }

        if (!sessionStatisztika.elozoJatekVege && jatekVegeMost) {
            sessionStatisztika.korok = sessionStatisztika.korok + 1;

            if (adat.uzenetTipus === 'nyert') {
                sessionStatisztika.nyertKorok = sessionStatisztika.nyertKorok + 1;
            } else if (adat.uzenetTipus === 'vesztett') {
                sessionStatisztika.vesztettKorok = sessionStatisztika.vesztettKorok + 1;
            } else {
                sessionStatisztika.dontetlenKorok = sessionStatisztika.dontetlenKorok + 1;
            }
        }

        sessionStatisztika.elozoJatekVege = jatekVegeMost;
    }

    async function szimulaltStatisztikakBetolt() {
        if (statisztikaKeresFolyamatban) {
            statisztikaUjraKereseSzukseges = true;
            return;
        }

        statisztikaKeresFolyamatban = true;
        try {
            const adat = await Fetch('/api/poker/statisztika');

            if (!isNaN(Number(adat.statikusHouseEdgeSzazalek))) {
                statisztikaAdatok.statikusHouseEdge = formatSzazalek(Number(adat.statikusHouseEdgeSzazalek));
            }
            if (!isNaN(Number(adat.statikusRoiSzazalek))) {
                statisztikaAdatok.statikusRoi = formatSzazalek(Number(adat.statikusRoiSzazalek));
            }
        } catch (error) {
            console.error('Poker statisztikai adat betöltési hiba:', error);
        } finally {
            statisztikaKeresFolyamatban = false;
            frissitPokerStatisztikak();

            if (statisztikaUjraKereseSzukseges) {
                statisztikaUjraKereseSzukseges = false;
                szimulaltStatisztikakBetolt();
            }
        }
    }

    function setStatisztikaVisible(visible) {
        const panel = document.getElementById('statisztikaPanel');
        const jatekTerulet = document.querySelector('.jatek-terulet');
        if (!panel || !jatekTerulet || !statsToggleBtn) {
            return;
        }

        if (visible) {
            panel.classList.add('visible');
            jatekTerulet.classList.add('statisztika-aktiv');
            statsToggleBtn.classList.add('active');
        } else {
            panel.classList.remove('visible');
            jatekTerulet.classList.remove('statisztika-aktiv');
            statsToggleBtn.classList.remove('active');
        }
    }

    function toggleStatisztika() {
        const jatekTerulet = document.querySelector('.jatek-terulet');
        if (!jatekTerulet) {
            return;
        }

        const aktiv = jatekTerulet.classList.contains('statisztika-aktiv');
        setStatisztikaVisible(!aktiv);
    }

    // Az oldal betöltésekor töltsd be az egyenleget az adatbázisból
    async function betoltEgyenleg() {
        try {
            const adat = await Fetch('/api/blackjack/user');
            if (adat.egyenleg !== undefined && adat.egyenleg !== null) {
                jatekosEgyenleg = parseFloat(adat.egyenleg) || 0;
                if (sessionStatisztika.kezdoEgyenleg === null) {
                    sessionStatisztika.kezdoEgyenleg = jatekosEgyenleg;
                }
                sessionStatisztika.sessionProfit = jatekosEgyenleg - sessionStatisztika.kezdoEgyenleg;
                document.getElementById('navbarEgyenleg').innerHTML = '$' + jatekosEgyenleg;
                frissitCsuszka();
                frissitUjJatekGomb();
                frissitPokerStatisztikak();
            }
        } catch (error) {
            console.error('Egyenleg betöltési hiba:', error);
        }
    }

    betoltEgyenleg();

    // Kártya kép / hátlap
    function kartyakep(lap) {
        return '<img src="../img/Kártyák/' + lap.szimbolum + '/' + lap.szam + '.png" class="kartya">';
    }
    function hatlap() {
        return '<img src="../img/Kártyák/Backside.png" class="kartya">';
    }

    // Csúszka szinkronizálás:
    function frissitCsuszka() {
        egyenlegMutato.textContent = '$' + jatekosEgyenleg;

        const maxErtek = Math.max(0, Math.floor(jatekosEgyenleg));
        const lepeskoz = maxErtek >= 50 ? 50 : 1;

        raiseSlider.min = 0;
        raiseInput.min = 0;
        raiseSlider.max = maxErtek;
        raiseInput.max = maxErtek;
        raiseSlider.step = lepeskoz;
        raiseInput.step = lepeskoz;

        if (maxErtek <= 0) {
            beallitEmelesErtek(0);
            return;
        }

        let aktualisErtek = parseInt(raiseInput.value);
        if (isNaN(aktualisErtek) || aktualisErtek <= 0) {
            aktualisErtek = Math.min(50, maxErtek);
        }

        beallitEmelesErtek(aktualisErtek);
    }

    function beallitEmelesErtek(ertek) {
        const minErtek = parseInt(raiseSlider.min) || 0;
        const maxErtek = parseInt(raiseSlider.max) || 0;
        let celErtek = parseInt(ertek);

        if (isNaN(celErtek)) celErtek = minErtek;
        if (celErtek < minErtek) celErtek = minErtek;
        if (celErtek > maxErtek) celErtek = maxErtek;

        raiseSlider.value = celErtek;
        raiseInput.value = celErtek;
    }

    raiseSlider.addEventListener('input', function () {
        beallitEmelesErtek(raiseSlider.value);
    });

    raiseInput.addEventListener('input', function () {
        beallitEmelesErtek(raiseInput.value);
    });

    // Api hívás:
    async function apiHivas(vegpont, callback, adat) {
        try {
            const valasz = await Fetch(vegpont, 'POST', adat || null);
            callback(valasz);
        } catch (error) {
            console.error('API hiba:', error);
            document.getElementById('eredmeny').innerHTML = '❌ ' + (error.message || 'Ismeretlen hiba');
            document.getElementById('eredmeny').className = 'hiba';
            // Gombok vissza engedélyezése az error után
            gombokBe();
        }
    }

    // Gombok engedélyezése:
    async function gombokBe() {
        // Az aktuális játék állapot lekérése és gombfrissítés
        try {
            const adat = await Fetch('/api/poker/allapot');
            gombokFrissit(adat);
        } catch (error) {
            console.error('Játékállapot lekérési hiba:', error);
        }
    }

    // Megjelenítés:
    function megjelenit(adat) {
        // Zseton kijelző
        jatekosEgyenleg = parseFloat(adat.jatekosZseton) || 0;
        document.getElementById('jatekos_zseton').innerHTML = '$' + adat.jatekosZseton;
        document.getElementById('pot').innerHTML = '$' + adat.pot;
        document.getElementById('egyenlegMutato').innerHTML = '$' + adat.jatekosZseton;
        document.getElementById('navbarEgyenleg').innerHTML = '$' + adat.jatekosZseton;

        // Csúszka frissítése
        frissitCsuszka();

        // Ellenfél lapjai
        const ellenfelDiv = document.getElementById('ellenfel');
        ellenfelDiv.innerHTML = '';
        if (adat.ellenfelLapok) {
            for (let i = 0; i < adat.ellenfelLapok.length; i++) {
                ellenfelDiv.innerHTML += kartyakep(adat.ellenfelLapok[i]);
            }
        } else {
            ellenfelDiv.innerHTML = hatlap() + hatlap();
        }

        // Asztal lapjai
        const osztoDiv = document.getElementById('oszto');
        osztoDiv.innerHTML = '';
        for (let j = 0; j < 5; j++) {
            if (j < adat.asztalLapok.length) {
                osztoDiv.innerHTML += kartyakep(adat.asztalLapok[j]);
            } else {
                osztoDiv.innerHTML += hatlap();
            }
        }

        // Játékos lapjai
        const kezDiv = document.getElementById('kez');
        kezDiv.innerHTML = '';
        for (let i = 0; i < adat.kez.length; i++) {
            kezDiv.innerHTML += kartyakep(adat.kez[i]);
        }

        // Pontszámok
        document.getElementById('pontjaid').innerHTML = adat.jatekosKez;
        document.getElementById('ellenfel_pont').innerHTML = adat.ellenfelKez || '-';

        // Eredmény / üzenet
        const eredmenyDiv = document.getElementById('eredmeny');
        eredmenyDiv.innerHTML = adat.uzenet || '';
        eredmenyDiv.className = adat.uzenetTipus || '';

        // Nyertes kiemelés
        if (adat.jatekVege && adat.uzenetTipus === 'nyert') {
            highlightKez('kez');
        } else if (adat.jatekVege && adat.uzenetTipus === 'vesztett') {
            highlightKez('ellenfel');
        }

        // Gombok kezelése
        gombokFrissit(adat);
        frissitUjJatekGomb();
        frissitSessionStatisztika(adat);
        frissitPokerStatisztikak();
        szimulaltStatisztikakBetolt();
    }

    // Gombok kezelése:
    function gombokKi() {
        checkBtn.disabled = true;
        callBtn.disabled = true;
        raiseBtn.disabled = true;
        foldBtn.disabled = true;
    }

    function frissitUjJatekGomb() {
        resetBtn.disabled = jatekosEgyenleg <= 0;
    }

    function gombokFrissit(adat) {
        if (adat.jatekVege || !adat.varakozikDontesre) {
            gombokKi();
            return;
        }

        foldBtn.disabled = false;

        const egyenlegUres = jatekosEgyenleg <= 0;
        const nincsElégCallra = jatekosEgyenleg < adat.aktualisTet;
        const emelesErtek = parseInt(raiseInput.value) || 0;
        const nincsElégEmelesre = emelesErtek <= 0 || emelesErtek > jatekosEgyenleg;

        if (adat.aktualisTet === 0) {
            checkBtn.disabled = false;
            callBtn.disabled = true;
            raiseBtn.disabled = nincsElégEmelesre;
        } else {
            checkBtn.disabled = true;
            callBtn.disabled = egyenlegUres || nincsElégCallra;
            raiseBtn.disabled = nincsElégEmelesre;
        }
    }

    // Highlight:
    function highlightKez(divId) {
        const lapok = document.getElementById(divId).querySelectorAll('.kartya');
        for (let i = 0; i < lapok.length; i++) lapok[i].classList.add('nyertes');
    }

    // Játékos döntés kiírása + késleltetett api hívás:
    function jatekosDontesKiiras(szoveg, vegpont, callback, adat) {
        const eredmenyDiv = document.getElementById('eredmeny');
        eredmenyDiv.innerHTML = szoveg;
        eredmenyDiv.className = '';
        setTimeout(function () {
            apiHivas(vegpont, callback, adat);
        }, 1000);
    }

    // Gomb események:
    checkBtn.addEventListener('click', function () {
        gombokKi();
        jatekosDontesKiiras('Te: Passz (Check)', '/api/poker/check', megjelenit);
    });

    callBtn.addEventListener('click', function () {
        gombokKi();
        jatekosDontesKiiras('Te: Tartás (Call)', '/api/poker/call', megjelenit);
    });

    raiseBtn.addEventListener('click', function () {
        const osszeg = parseInt(raiseInput.value) || 0;
        if (osszeg <= 0) return;
        gombokKi();
        jatekosDontesKiiras('Te: Emelés (Raise) +$' + osszeg, '/api/poker/raise', megjelenit, { osszeg: osszeg });
    });

    foldBtn.addEventListener('click', function () {
        gombokKi();
        apiHivas('/api/poker/fold', megjelenit);
    });

    resetBtn.addEventListener('click', function () {
        if (jatekosEgyenleg <= 0) return;
        apiHivas('/api/poker/uj', megjelenit);
    });

    if (statsToggleBtn) {
        statsToggleBtn.addEventListener('click', function (event) {
            event.preventDefault();
            toggleStatisztika();
        });
    }

    // Oldal betöltéskor:
    gombokKi();
    frissitUjJatekGomb();
    setStatisztikaVisible(false);
    frissitPokerStatisztikak();
    szimulaltStatisztikakBetolt();
});
