document.addEventListener('DOMContentLoaded', function () {
    // DOM elemek
    var checkBtn = document.getElementById('checkBtn');
    var callBtn = document.getElementById('callBtn');
    var raiseBtn = document.getElementById('raiseBtn');
    var foldBtn = document.getElementById('foldBtn');
    var resetBtn = document.getElementById('resetBtn');
    var raiseSlider = document.getElementById('raiseSlider');
    var raiseInput = document.getElementById('raiseInput');
    var egyenlegMutato = document.getElementById('egyenlegMutato');
    var statsToggleBtn = document.getElementById('statsToggleBtn');

    // Játékos egyenleg – kezdetben betöltődik az adatbázisból
    var jatekosEgyenleg = 0;

    var statisztikaAdatok = {
        statikusHouseEdge: '0.0%',
        statikusRoi: '0.0%'
    };

    var sessionStatisztika = {
        korok: 0,
        nyertKorok: 0,
        vesztettKorok: 0,
        dontetlenKorok: 0,
        kezdoEgyenleg: null,
        sessionProfit: 0,
        elozoJatekVege: null
    };

    var statisztikaKeresFolyamatban = false;
    var statisztikaUjraKereseSzukseges = false;

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

        var abs = Math.abs(Number(ertek)).toFixed(2);
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
        var sessionWinLossEl = document.getElementById('stat-session-winloss');
        var sessionWinrateEl = document.getElementById('stat-session-winrate');
        var sessionRoundsEl = document.getElementById('stat-session-rounds');
        var sessionProfitEl = document.getElementById('stat-session-profit');
        var houseEdgeEl = document.getElementById('stat-house-edge');
        var roiEl = document.getElementById('stat-roi');

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
        var aktualisEgyenleg = Number(adat.jatekosZseton);
        if (isNaN(aktualisEgyenleg)) {
            aktualisEgyenleg = 0;
        }

        if (sessionStatisztika.kezdoEgyenleg === null) {
            sessionStatisztika.kezdoEgyenleg = aktualisEgyenleg;
        }
        sessionStatisztika.sessionProfit = aktualisEgyenleg - sessionStatisztika.kezdoEgyenleg;

        var jatekVegeMost = !!adat.jatekVege;
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
            var response = await fetch('/api/poker/statisztika', {
                method: 'GET',
                headers: { 'Content-type': 'application/json' }
            });
            if (!response.ok) {
                throw new Error('Hiba: ' + response.statusText);
            }
            var adat = await response.json();

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
        var panel = document.getElementById('statisztikaPanel');
        var jatekTerulet = document.querySelector('.jatek-terulet');
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
        var jatekTerulet = document.querySelector('.jatek-terulet');
        if (!jatekTerulet) {
            return;
        }

        var aktiv = jatekTerulet.classList.contains('statisztika-aktiv');
        setStatisztikaVisible(!aktiv);
    }

    // Az oldal betöltésekor töltsd be az egyenleget az adatbázisból
    function betoltEgyenleg() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/blackjack/user', true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                var adat = JSON.parse(xhr.responseText);
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
            } else {
                console.error('Egyenleg betöltés hiba:', xhr.status);
            }
        };
        xhr.onerror = function () {
            console.error('Hálózati hiba az egyenleg betöltésénél');
        };
        xhr.send();
    }

    betoltEgyenleg();

    // Kártya kép / hátlap
    function kartyakep(lap) {
        return '<img src="../img/Kártyák/' + lap.szimbolum + '/' + lap.szam + '.png" class="kartya">';
    }
    function hatlap() {
        return '<img src="../img/Kártyák/Backside.png" class="kartya">';
    }

    // ==================== CSÚSZKA SZINKRONIZÁLÁS ====================
    function frissitCsuszka() {
        egyenlegMutato.textContent = '$' + jatekosEgyenleg;

        var maxErtek = Math.max(0, Math.floor(jatekosEgyenleg));
        var lepeskoz = maxErtek >= 50 ? 50 : 1;

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

        var aktualisErtek = parseInt(raiseInput.value);
        if (isNaN(aktualisErtek) || aktualisErtek <= 0) {
            aktualisErtek = Math.min(50, maxErtek);
        }

        beallitEmelesErtek(aktualisErtek);
    }

    function beallitEmelesErtek(ertek) {
        var minErtek = parseInt(raiseSlider.min) || 0;
        var maxErtek = parseInt(raiseSlider.max) || 0;
        var celErtek = parseInt(ertek);

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

    // ==================== API HÍVÁS ====================
    function apiHivas(vegpont, callback, adat) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', vegpont, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function () {
            if (xhr.status === 200) {
                var valasz = JSON.parse(xhr.responseText);
                callback(valasz);
            } else {
                try {
                    var errorObj = JSON.parse(xhr.responseText);
                    console.error('API hiba:', xhr.status, errorObj);
                    document.getElementById('eredmeny').innerHTML = '❌ Hiba: ' + (errorObj.hiba || errorObj.error || 'Ismeretlen hiba');
                    document.getElementById('eredmeny').className = 'hiba';
                } catch (e) {
                    console.error('API hiba:', xhr.status, xhr.responseText);
                    document.getElementById('eredmeny').innerHTML = '❌ Hiba: ' + xhr.status;
                    document.getElementById('eredmeny').className = 'hiba';
                }
                // Gombok vissza engedélyezése az error után
                gombokBe();
            }
        };
        xhr.onerror = function () {
            console.error('Hálózati hiba');
            document.getElementById('eredmeny').innerHTML = '❌ Hálózati hiba';
            document.getElementById('eredmeny').className = 'hiba';
            gombokBe();
        };
        xhr.send(adat ? JSON.stringify(adat) : null);
    }

    // ==================== GOMBOK ENGEDÉLYEZÉSE ====================
    function gombokBe() {
        // Az aktuális játék állapot lekérése és gombfrissítés
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/poker/allapot', true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                var adat = JSON.parse(xhr.responseText);
                gombokFrissit(adat);
            }
        };
        xhr.send();
    }

    // ==================== MEGJELENÍTÉS ====================
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
        var ellenfelDiv = document.getElementById('ellenfel');
        ellenfelDiv.innerHTML = '';
        if (adat.ellenfelLapok) {
            for (var i = 0; i < adat.ellenfelLapok.length; i++) {
                ellenfelDiv.innerHTML += kartyakep(adat.ellenfelLapok[i]);
            }
        } else {
            ellenfelDiv.innerHTML = hatlap() + hatlap();
        }

        // Asztal lapjai
        var osztoDiv = document.getElementById('oszto');
        osztoDiv.innerHTML = '';
        for (var j = 0; j < 5; j++) {
            if (j < adat.asztalLapok.length) {
                osztoDiv.innerHTML += kartyakep(adat.asztalLapok[j]);
            } else {
                osztoDiv.innerHTML += hatlap();
            }
        }

        // Játékos lapjai
        var kezDiv = document.getElementById('kez');
        kezDiv.innerHTML = '';
        for (var i = 0; i < adat.kez.length; i++) {
            kezDiv.innerHTML += kartyakep(adat.kez[i]);
        }

        // Pontszámok
        document.getElementById('pontjaid').innerHTML = adat.jatekosKez;
        document.getElementById('ellenfel_pont').innerHTML = adat.ellenfelKez || '-';

        // Eredmény / üzenet
        var eredmenyDiv = document.getElementById('eredmeny');
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

    // ==================== GOMBOK KEZELÉSE ====================
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

        var egyenlegUres = jatekosEgyenleg <= 0;
        var nincsElégCallra = jatekosEgyenleg < adat.aktualisTet;
        var emelesErtek = parseInt(raiseInput.value) || 0;
        var nincsElégEmelesre = emelesErtek <= 0 || emelesErtek > jatekosEgyenleg;

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

    // ==================== HIGHLIGHT ====================
    function highlightKez(divId) {
        var lapok = document.getElementById(divId).querySelectorAll('.kartya');
        for (var i = 0; i < lapok.length; i++) lapok[i].classList.add('nyertes');
    }

    // ==================== JÁTÉKOS DÖNTÉS KIÍRÁSA + KÉSLELTETETT API HÍVÁS ====================
    function jatekosDontesKiiras(szoveg, vegpont, callback, adat) {
        var eredmenyDiv = document.getElementById('eredmeny');
        eredmenyDiv.innerHTML = szoveg;
        eredmenyDiv.className = '';
        setTimeout(function () {
            apiHivas(vegpont, callback, adat);
        }, 1000);
    }

    // ==================== GOMB ESEMÉNYEK ====================
    checkBtn.addEventListener('click', function () {
        gombokKi();
        jatekosDontesKiiras('Te: Passz (Check)', '/api/poker/check', megjelenit);
    });

    callBtn.addEventListener('click', function () {
        gombokKi();
        jatekosDontesKiiras('Te: Tartás (Call)', '/api/poker/call', megjelenit);
    });

    raiseBtn.addEventListener('click', function () {
        var osszeg = parseInt(raiseInput.value) || 0;
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

    // ==================== OLDAL BETÖLTÉSKOR ====================
    gombokKi();
    frissitUjJatekGomb();
    setStatisztikaVisible(false);
    frissitPokerStatisztikak();
    szimulaltStatisztikakBetolt();
});
