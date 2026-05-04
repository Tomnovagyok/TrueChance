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

// Játék globális állapota (state) - ebben tartjuk nyilván, hogy mi történik épp a játékban
// Ezt az állapotot szinkronizáljuk a backendről jövő válaszokkal
let gameState = {
    jatekosKez: [],
    osztoKez: [],
    jatekosKez2: [],
    osztoRejtett: true,
    kezIndex: 1,
    status: 'idle',
    tet: 0,
    egyenleg: null
};
let aktualisKorLevontTet = 0;
let utolsoTetBeallitas = 0;

function getMaxTet() {
    const egyenleg = Number(gameState.egyenleg);
    if (isNaN(egyenleg) || egyenleg <= 0) {
        return 0;
    }
    return Math.floor(egyenleg);
}

function normalizalTetErtek(ertek, maxTet) {
    let tetErtek = parseInt(ertek);
    if (isNaN(tetErtek)) {
        tetErtek = 0;
    }

    if (tetErtek < 0) {
        tetErtek = 0;
    }
    if (tetErtek > maxTet) {
        tetErtek = maxTet;
    }

    if (tetErtek === 0 || maxTet < 50) {
        return 0;
    }

    return Math.floor(tetErtek / 50) * 50;
}

function frissitTetBeallitasok() {
    const slider = document.getElementById('tetSlider');
    const input = document.getElementById('tetInput');
    const startGameBtn = document.getElementById('startGameBtn');

    if (!slider || !input) {
        return;
    }

    const maxTet = getMaxTet();
    const tudJatszani = maxTet >= 50;

    slider.min = 0;
    input.min = 0;
    slider.max = maxTet;
    input.max = maxTet;
    slider.step = 50;
    input.step = 50;

    const alapTet = tudJatszani ? 50 : 0;
    const elozoTet = utolsoTetBeallitas > 0 ? utolsoTetBeallitas : input.value;
    const aktualisTet = normalizalTetErtek(elozoTet, maxTet);
    const beallitandoTet = aktualisTet > 0 ? aktualisTet : alapTet;

    slider.value = beallitandoTet;
    input.value = beallitandoTet;
    if (beallitandoTet > 0) {
        utolsoTetBeallitas = beallitandoTet;
    }

    slider.disabled = !tudJatszani;
    input.disabled = !tudJatszani;
    if (startGameBtn) {
        startGameBtn.disabled = !tudJatszani;
    }
}

// Egyenleg betöltése
async function loadEgyenleg() {
    try {
        const data = await Fetch('/api/blackjack/user');
        if (data && data.egyenleg !== undefined) {
            gameState.egyenleg = Number(data.egyenleg);
            updateEgyenlegDisplay(gameState.egyenleg);
            frissitTetBeallitasok();
        } else {
            // Ha nincs egyenleg adat, mutassunk $0-t
            gameState.egyenleg = 0;
            updateEgyenlegDisplay(0);
            frissitTetBeallitasok();
        }
    } catch (error) {
        console.error('Egyenleg betöltése sikertelen:', error);
        // Hiba esetén is frissítsük a kijelzőt
        gameState.egyenleg = 0;
        updateEgyenlegDisplay(0);
        frissitTetBeallitasok();
    }
}

// Egyenleg megjelenítés frissítése
function updateEgyenlegDisplay(egyenleg) {
    // Ha az egyenleg undefined, null vagy NaN, ne csináljunk semmit
    if (egyenleg === undefined || egyenleg === null || isNaN(egyenleg)) {
        return;
    }

    // Biztosítsuk, hogy szám legyen
    const egyenlegNum = Number(egyenleg);
    const formatalt = `$${egyenlegNum.toFixed(2)}`;

    const egyenlegMutato = document.getElementById('egyenlegMutato');
    if (egyenlegMutato) egyenlegMutato.textContent = formatalt;

    const egyenlegInfo = document.getElementById('egyenlegInfo');
    if (egyenlegInfo) egyenlegInfo.textContent = formatalt;

    const navbarEgyenleg = document.getElementById('navbarEgyenleg');
    if (navbarEgyenleg) navbarEgyenleg.textContent = formatalt;
}

// Kártya megjelenítés
function kartyakep(lap) {
    return `<img src="../img/Kártyák/${lap.szimbolum}/${lap.szam}.png" class="kartya">`;
}

function hatlap() {
    return '<img src="../img/Kártyák/Backside.png" class="kartya">';
}

// Kéz értékének kiszámítása (frontend für megjelenítéshez)
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

// UI frissítés
function updateUI(state) {
    gameState = state;

    // Játékos lapjainak megjelenítése
    const kezDiv = document.getElementById('kez');
    if (kezDiv) {
        kezDiv.innerHTML = '';

        // Első kéz
        const kez1Div = document.createElement('div');
        kez1Div.className = 'jatekos-kez';
        if (state.kezIndex === 1 && state.jatekosKez2.length > 0) {
            kez1Div.className += ' aktiv';
        }
        for (let i = 0; i < state.jatekosKez.length; i++) {
            kez1Div.innerHTML += kartyakep(state.jatekosKez[i]);
        }
        kezDiv.appendChild(kez1Div);

        // Szeparátor és második kéz (ha van split)
        if (state.jatekosKez2.length > 0) {
            const szeparator = document.createElement('span');
            szeparator.innerHTML = ' | ';
            kezDiv.appendChild(szeparator);

            const kez2Div = document.createElement('div');
            kez2Div.className = 'jatekos-kez';
            if (state.kezIndex === 2) {
                kez2Div.className += ' aktiv';
            }
            for (let i = 0; i < state.jatekosKez2.length; i++) {
                kez2Div.innerHTML += kartyakep(state.jatekosKez2[i]);
            }
            kezDiv.appendChild(kez2Div);
        }
    }

    // Jelenlegi kéz szöveg
    const jelenlegiKezEl = document.getElementById('jelenlegi_kez');
    if (jelenlegiKezEl) {
        if (state.jatekosKez2.length > 0) {
            jelenlegiKezEl.innerHTML = 'Jelenlegi kéz: ' + (state.kezIndex === 1 ? 'Első' : 'Második');
        } else {
            jelenlegiKezEl.innerHTML = '';
        }
    }

    // Játékos pontjainak megjelenítése
    const jatekosOsszegEl = document.getElementById('jatekos_osszeg');
    if (jatekosOsszegEl) {
        if (state.jatekosKez.length === 0 && state.jatekosKez2.length === 0) {
            jatekosOsszegEl.innerHTML = '-';
        } else {
            const ertek1 = state.jatekosKez.length ? kezErtek(state.jatekosKez) : '-';
            const ertek2 = state.jatekosKez2.length ? kezErtek(state.jatekosKez2) : '';
            let szoveg = '' + ertek1;
            if (state.jatekosKez2.length > 0) szoveg += ' | ' + ertek2;
            jatekosOsszegEl.innerHTML = szoveg;
        }
    }

    // Osztó lapjainak megjelenítése
    const osztoDiv = document.getElementById('oszto');
    if (osztoDiv) {
        osztoDiv.innerHTML = '';
        if (state.osztoKez.length > 0) {
            const osztoKezDiv = document.createElement('div');
            osztoKezDiv.innerHTML = kartyakep(state.osztoKez[0]);
            if (state.osztoKez.length > 1) {
                if (state.osztoRejtett) {
                    osztoKezDiv.innerHTML += hatlap();
                } else {
                    for (let j = 1; j < state.osztoKez.length; j++) {
                        osztoKezDiv.innerHTML += kartyakep(state.osztoKez[j]);
                    }
                }
            }
            osztoDiv.appendChild(osztoKezDiv);
        }
    }

    // Osztó pontjainak megjelenítése
    const osztoOsszegEl = document.getElementById('oszto_osszeg');
    if (osztoOsszegEl) {
        if (state.osztoKez.length === 0) {
            osztoOsszegEl.innerHTML = '-';
        } else if (state.osztoRejtett) {
            osztoOsszegEl.innerHTML = '?';
        } else {
            const pont = state.osztoPont !== undefined ? state.osztoPont : state.osztoKez.length ? kezErtek(state.osztoKez) : '-';
            osztoOsszegEl.innerHTML = pont;
        }
    }

    // Állapot szöveg
    const statusEl = document.getElementById('pontjaid');
    if (statusEl) {
        statusEl.innerHTML = state.eredmeny;
    }

    // Lépésajánló frissítése a chart alapján
    frissitLepesAjanlo(state);

    // Gombok kezelése
    updateButtons(state);
}

// Gombok engedélyezése/letiltása
function updateButtons(state) {
    const nextBtn = document.getElementById('nextBtn');
    const doubleBtn = document.getElementById('doubleBtn');
    const splitBtn = document.getElementById('splitBtn');
    const standBtn = document.getElementById('standBtn');
    const resetBtn = document.getElementById('resetBtn');

    // Ha bust, akkor az összes gomb disabled (csak reset engedélyezett)
    if (state.bust) {
        disableActionButtonsExceptReset();
        return;
    }

    if (state.status === 'ongoing') {
        disableActionButtonsExceptReset();
        if (nextBtn) nextBtn.disabled = false;
        if (doubleBtn) doubleBtn.disabled = !state.canDouble;
        if (splitBtn) splitBtn.disabled = !state.canSplit;
        if (standBtn) standBtn.disabled = false;
        if (resetBtn) resetBtn.disabled = false;
    } else if (state.status === 'stand_needed') {
        disableActionButtonsExceptReset();
        if (standBtn) standBtn.disabled = false;
        if (resetBtn) resetBtn.disabled = false;
    } else if (state.status === 'gameover') {
        disableActionButtonsExceptReset();
    } else {
        disableActionButtonsExceptReset();
    }
}

function disableAllButtons() {
    const nextBtn = document.getElementById('nextBtn');
    const doubleBtn = document.getElementById('doubleBtn');
    const splitBtn = document.getElementById('splitBtn');
    const standBtn = document.getElementById('standBtn');
    const resetBtn = document.getElementById('resetBtn');

    if (nextBtn) nextBtn.disabled = true;
    if (doubleBtn) doubleBtn.disabled = true;
    if (splitBtn) splitBtn.disabled = true;
    if (standBtn) standBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = true;
}

function disableActionButtonsExceptReset() {
    disableAllButtons();

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.disabled = false;
}

// API hívások
async function initGame() {
    try {
        // Ha nincs egyenleg betöltve, töltsük be
        if (gameState.egyenleg === undefined || gameState.egyenleg === null || isNaN(gameState.egyenleg)) {
            await loadEgyenleg();
        }

        const tetInputElem = document.getElementById('tetInput');
        const maxTet = getMaxTet();
        const tet = normalizalTetErtek(tetInputElem.value, maxTet);
        tetInputElem.value = tet;
        utolsoTetBeallitas = tet;

        if (maxTet < 50) {
            alert('Nincs elég egyenleged a játék indításához.');
            return;
        }

        if (tet <= 0) {
            alert('A minimális tét $50.');
            return;
        }

        if (tet % 50 !== 0) {
            alert('A tét 50-es lépésekben adható meg.');
            return;
        }

        if (tet > maxTet || tet > gameState.egyenleg) {
            alert('Nincs elég egyenleged a téthez!');
            return;
        }

        // Tét panel disabled állapotba
        const tetSlider = document.getElementById('tetSlider');
        const startGameBtn = document.getElementById('startGameBtn');

        if (tetSlider) tetSlider.disabled = true;
        if (tetInputElem) tetInputElem.disabled = true;
        if (startGameBtn) startGameBtn.disabled = true;

        const state = await Fetch('/api/blackjack/init', 'POST', { tet });
        state.status = 'ongoing';
        updateUI(state);

        // Tét megjelenítése
        const tetMutato = document.getElementById('tetMutato');
        if (tetMutato) tetMutato.textContent = `$${tet}`;

        // Egyenleg frissítése a backend válaszából (már le lett vonva)
        gameState.tet = tet;
        aktualisKorLevontTet = tet;
        if (state.ujEgyenleg !== undefined) {
            gameState.egyenleg = state.ujEgyenleg;
            updateEgyenlegDisplay(state.ujEgyenleg);
        }

        // Ha blackjack, automatikusan stand
        if (state.isBlackjack) {
            setTimeout(() => stand(), 500);
        } else {
            AutoStand();
        }
    } catch (error) {
        console.error('Játék inicializálása sikertelen:', error);
        alert('Játék indítása sikertelen: ' + error.message);
        showTetPanel();
    }
}

async function hit() {
    try {
        const state = await Fetch('/api/blackjack/hit', 'POST', {});
        updateUI(state);

        if (autoStandMasodikKezHa21(state) || autoLezarKortHaKell(state)) {
            return;
        }

        const aktualisKez = state.kezIndex === 1 ? state.jatekosKez : state.jatekosKez2;
        const normalHit21 = state.status === 'ongoing' && state.jatekosKez2.length === 0 && aktualisKez.length > 0 && kezErtek(aktualisKez) === 21;

        if (normalHit21) {
            disableActionButtonsExceptReset();
            setTimeout(() => stand(), 500);
        }
    } catch (error) {
        console.error('hit sikertelen:', error);
    }
}

async function double() {
    try {
        const state = await Fetch('/api/blackjack/double', 'POST', {});
        updateUI(state);

        // Egyenleg frissítése a backend válaszából (plusz tét levonva)
        if (state.ujEgyenleg !== undefined) {
            gameState.egyenleg = state.ujEgyenleg;
            updateEgyenlegDisplay(state.ujEgyenleg);
        }

        // A tét mutatót is frissítsük (dupla tét)
        const tetMutato = document.getElementById('tetMutato');
        if (tetMutato && state.levontTet) {
            tetMutato.textContent = `$${state.levontTet}`;
            aktualisKorLevontTet = Number(state.levontTet);
        }

        if (autoStandMasodikKezHa21(state) || autoLezarKortHaKell(state)) {
            return;
        }

    } catch (error) {
        console.error('Double sikertelen:', error);
    }
}

async function split() {
    try {
        const state = await Fetch('/api/blackjack/split', 'POST', {});
        updateUI(state);

        // Egyenleg frissítése a backend válaszából (plusz tét levonva)
        if (state.ujEgyenleg !== undefined) {
            gameState.egyenleg = state.ujEgyenleg;
            updateEgyenlegDisplay(state.ujEgyenleg);
        }

        // A tét mutatót is frissítsük (dupla tét)
        const tetMutato = document.getElementById('tetMutato');
        if (tetMutato && state.levontTet) {
            tetMutato.textContent = `$${state.levontTet}`;
            aktualisKorLevontTet = Number(state.levontTet);
        }
    } catch (error) {
        console.error('Split sikertelen:', error);
    }
}

async function stand() {
    try {
        const state = await Fetch('/api/blackjack/stand', 'POST', {});
        updateUI(state);

        if (autoStandMasodikKezHa21(state)) {
            return;
        }

        // Ha gameover, frissítjük az egyenleget
        if (state.status === 'gameover') {
            if (state.ujEgyenleg !== undefined) {
                gameState.egyenleg = state.ujEgyenleg;
                updateEgyenlegDisplay(state.ujEgyenleg);
            }

            // Nyeremény megjelenítése
            if (state.nyeremeny > 0) {
                const statusEl = document.getElementById('pontjaid');
                if (statusEl) {
                    statusEl.innerHTML = state.eredmeny + ` | Nyeremény: $${state.nyeremeny.toFixed(2)}`;
                }
            }

            frissitSessionStatisztikaGameover(state);
            aktualisKorLevontTet = 0;
        }
    } catch (error) {
        console.error('Stand sikertelen:', error);
    }
}

// Tét panel újra engedélyezése
function showTetPanel() {
    frissitTetBeallitasok();

    // Asztal ürítése
    const kezEl = document.getElementById('kez');
    if (kezEl) kezEl.innerHTML = '';
    const osztoEl = document.getElementById('oszto');
    if (osztoEl) osztoEl.innerHTML = '';

    // Státusz és pontszámok ürítése
    const statusEl = document.getElementById('pontjaid');
    if (statusEl) statusEl.innerHTML = 'Állítsd be a tétet és indítsd a játékot!';
    const jatekosOsszegEl = document.getElementById('jatekos_osszeg');
    if (jatekosOsszegEl) jatekosOsszegEl.innerHTML = '-';
    const osztoOsszegEl = document.getElementById('oszto_osszeg');
    if (osztoOsszegEl) osztoOsszegEl.innerHTML = '-';
    const jelenlegiKezEl = document.getElementById('jelenlegi_kez');
    if (jelenlegiKezEl) jelenlegiKezEl.innerHTML = '';

    const tetMutato = document.getElementById('tetMutato');
    if (tetMutato) tetMutato.textContent = '$0';
    aktualisKorLevontTet = 0;

    frissitLepesAjanlo(null);
}

async function reset() {
    try {
        disableAllButtons();
        showTetPanel();
        await loadEgyenleg();
    } catch (error) {
        console.error('Reset sikertelen:', error);
    }
}

// Automatikus Stand ha blackjack
function AutoStand() {
    if (kezErtek(gameState.jatekosKez) === 21) {
        disableActionButtonsExceptReset();
        setTimeout(() => stand(), 500);
    }
}

function autoLezarKortHaKell(state) {
    if (!state) {
        return false;
    }

    if (state.status === 'stand_needed') {
        disableActionButtonsExceptReset();
        setTimeout(() => stand(), 500);
        return true;
    }

    return false;
}

function autoStandMasodikKezHa21(state) {
    const splitAktiv = state && state.jatekosKez2 && state.jatekosKez2.length > 0;
    if (!splitAktiv || !state.switchHand || state.kezIndex !== 2) {
        return false;
    }

    if (kezErtek(state.jatekosKez2) === 21) {
        disableActionButtonsExceptReset();
        setTimeout(() => stand(), 500);
        return true;
    }

    return false;
}

// Event listenrek
document.addEventListener('DOMContentLoaded', function () {
    // Játék gombok
    const nextBtn = document.getElementById('nextBtn');
    const doubleBtn = document.getElementById('doubleBtn');
    const splitBtn = document.getElementById('splitBtn');
    const standBtn = document.getElementById('standBtn');
    const resetBtn = document.getElementById('resetBtn');
    const startGameBtn = document.getElementById('startGameBtn');

    if (nextBtn) nextBtn.addEventListener('click', hit);
    if (doubleBtn) doubleBtn.addEventListener('click', double);
    if (splitBtn) splitBtn.addEventListener('click', split);
    if (standBtn) standBtn.addEventListener('click', stand);
    if (resetBtn) resetBtn.addEventListener('click', reset);
    if (startGameBtn) startGameBtn.addEventListener('click', initGame);

    // Tét slider és input szinkronizálása
    const tetSlider = document.getElementById('tetSlider');
    const tetInput = document.getElementById('tetInput');

    if (tetSlider && tetInput) {
        tetSlider.addEventListener('input', function () {
            tetInput.value = tetSlider.value;
            utolsoTetBeallitas = normalizalTetErtek(tetSlider.value, getMaxTet());
        });

        tetInput.addEventListener('input', function () {
            const maxTet = getMaxTet();
            const normalizaltTet = normalizalTetErtek(tetInput.value, maxTet);
            tetInput.value = normalizaltTet;
            tetSlider.value = normalizaltTet;
            utolsoTetBeallitas = normalizaltTet;
        });
    }

    // Kezdeti állapot: egyenleg betöltése és tét panel megjelenítése
    loadEgyenleg();
    showTetPanel();
});

// Statisztika panel kezelés
function setStatisztikaVisible(visible) {
    const panel = document.getElementById('statisztikaPanel');
    const jatekTerulet = document.querySelector('.jatek-terulet');
    const statsGomb = document.getElementById('statsToggleBtn');
    if (!panel || !jatekTerulet || !statsGomb) return;

    if (visible) {
        panel.classList.add('visible');
        jatekTerulet.classList.add('statisztika-aktiv');
        statsGomb.classList.add('active');
    } else {
        panel.classList.remove('visible');
        jatekTerulet.classList.remove('statisztika-aktiv');
        statsGomb.classList.remove('active');
    }

    frissitLepesAjanlo(gameState);
}

function toggleStatisztika() {
    const jatekTerulet = document.querySelector('.jatek-terulet');
    if (!jatekTerulet) return;
    const isVisible = jatekTerulet.classList.contains('statisztika-aktiv');
    setStatisztikaVisible(!isVisible);
}

const statisztikaAdatok = {
    winrate: '0.0%',
    houseEdge: '2.7%',
    roi: '-3.5%',
    sessionProfit: '$0.00',
    sessionRounds: '0'
};

const sessionStatisztika = {
    korok: 0,
    nyertKorok: 0,
    nettoProfit: 0
};

function formatPenz(ertek) {
    if (ertek === null || ertek === undefined || isNaN(ertek)) {
        return '$0.00';
    }
    const abs = Math.abs(ertek).toFixed(2);
    return `${ertek < 0 ? '-' : ''}$${abs}`;
}

function szamolSessionWinRateSzoveg() {
    if (sessionStatisztika.korok === 0) {
        return '0.0%';
    }
    return `${((sessionStatisztika.nyertKorok / sessionStatisztika.korok) * 100).toFixed(1)}%`;
}

function frissitSessionStatisztikaGameover(state) {
    const levontTet = Number(aktualisKorLevontTet || gameState.tet || 0);
    const nyeremeny = Number(state.nyeremeny || 0);
    const netto = nyeremeny - levontTet;

    sessionStatisztika.korok += 1;
    if (netto > 0) {
        sessionStatisztika.nyertKorok += 1;
    }
    sessionStatisztika.nettoProfit += netto;

    updateStatisztikak({
        winrate: szamolSessionWinRateSzoveg(),
        houseEdge: statisztikaAdatok.houseEdge,
        roi: statisztikaAdatok.roi,
        sessionProfit: formatPenz(sessionStatisztika.nettoProfit),
        sessionRounds: String(sessionStatisztika.korok)
    });
}

const blackjackStrategia = {
    hard: {
        '8': { '2': 'H', '3': 'H', '4': 'H', '5': 'H', '6': 'H', '7': 'H', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        '9': { '2': 'H', '3': 'D', '4': 'D', '5': 'D', '6': 'D', '7': 'H', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        '10': { '2': 'D', '3': 'D', '4': 'D', '5': 'D', '6': 'D', '7': 'D', '8': 'D', '9': 'D', '10': 'H', A: 'H' },
        '11': { '2': 'D', '3': 'D', '4': 'D', '5': 'D', '6': 'D', '7': 'D', '8': 'D', '9': 'D', '10': 'D', A: 'H' },
        '12': { '2': 'H', '3': 'H', '4': 'S', '5': 'S', '6': 'S', '7': 'H', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        '13': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'S', '7': 'H', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        '14': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'S', '7': 'H', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        '15': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'S', '7': 'H', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        '16': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'S', '7': 'H', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        '17': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'S', '7': 'S', '8': 'S', '9': 'S', '10': 'S', A: 'S' }
    },
    soft: {
        'A,2': { '2': 'H', '3': 'H', '4': 'H', '5': 'D', '6': 'D', '7': 'H', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        'A,3': { '2': 'H', '3': 'H', '4': 'H', '5': 'D', '6': 'D', '7': 'H', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        'A,4': { '2': 'H', '3': 'H', '4': 'D', '5': 'D', '6': 'D', '7': 'H', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        'A,5': { '2': 'H', '3': 'H', '4': 'D', '5': 'D', '6': 'D', '7': 'H', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        'A,6': { '2': 'H', '3': 'D', '4': 'D', '5': 'D', '6': 'D', '7': 'H', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        'A,7': { '2': 'S', '3': 'D', '4': 'D', '5': 'D', '6': 'D', '7': 'S', '8': 'S', '9': 'H', '10': 'H', A: 'H' },
        'A,8': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'S', '7': 'S', '8': 'S', '9': 'S', '10': 'S', A: 'S' },
        'A,9': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'S', '7': 'S', '8': 'S', '9': 'S', '10': 'S', A: 'S' }
    },
    pair: {
        '2,2': { '2': 'H', '3': 'H', '4': 'P', '5': 'P', '6': 'P', '7': 'P', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        '3,3': { '2': 'H', '3': 'H', '4': 'P', '5': 'P', '6': 'P', '7': 'P', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        '6,6': { '2': 'H', '3': 'P', '4': 'P', '5': 'P', '6': 'P', '7': 'H', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        '7,7': { '2': 'P', '3': 'P', '4': 'P', '5': 'P', '6': 'P', '7': 'P', '8': 'H', '9': 'H', '10': 'H', A: 'H' },
        '8,8': { '2': 'P', '3': 'P', '4': 'P', '5': 'P', '6': 'P', '7': 'P', '8': 'P', '9': 'P', '10': 'P', A: 'P' },
        '9,9': { '2': 'P', '3': 'P', '4': 'P', '5': 'P', '6': 'P', '7': 'S', '8': 'P', '9': 'P', '10': 'S', A: 'S' },
        'A,A': { '2': 'P', '3': 'P', '4': 'P', '5': 'P', '6': 'P', '7': 'P', '8': 'P', '9': 'P', '10': 'P', A: 'P' }
    }
};

function normalizalLapKulcs(lap) {
    if (!lap || lap.szam === undefined || lap.szam === null) {
        return null;
    }

    const lapErtek = String(lap.szam).toUpperCase();
    if (lapErtek === 'J' || lapErtek === 'Q' || lapErtek === 'K') {
        return '10';
    }

    return lapErtek;
}

function getAktivJatekosKez(state) {
    if (!state) {
        return [];
    }

    if (state.kezIndex === 2 && state.jatekosKez2 && state.jatekosKez2.length > 0) {
        return state.jatekosKez2;
    }

    return state.jatekosKez || [];
}

function szamolKezAllapot(kez) {
    let osszeg = 0;
    let aszDarab = 0;

    for (let i = 0; i < kez.length; i++) {
        const lap = kez[i];
        const kulcs = normalizalLapKulcs(lap);
        if (kulcs === 'A') {
            aszDarab++;
            osszeg += 11;
        } else if (kulcs === '10') {
            osszeg += 10;
        } else {
            const szam = Number(kulcs);
            if (!isNaN(szam)) {
                osszeg += szam;
            }
        }
    }

    let maradtAsz = aszDarab;
    while (osszeg > 21 && maradtAsz > 0) {
        osszeg -= 10;
        maradtAsz--;
    }

    return {
        osszeg: osszeg,
        soft: maradtAsz > 0
    };
}

function getHardSorKulcs(osszeg) {
    if (osszeg <= 8) {
        return '8';
    }
    if (osszeg >= 17) {
        return '17';
    }
    return String(osszeg);
}

function getSoftSorKulcs(osszeg) {
    if (osszeg <= 13) return 'A,2';
    if (osszeg === 14) return 'A,3';
    if (osszeg === 15) return 'A,4';
    if (osszeg === 16) return 'A,5';
    if (osszeg === 17) return 'A,6';
    if (osszeg === 18) return 'A,7';
    if (osszeg === 19) return 'A,8';
    return 'A,9';
}

function getParSorKulcs(kez) {
    if (!kez || kez.length !== 2) {
        return null;
    }

    const elso = normalizalLapKulcs(kez[0]);
    const masodik = normalizalLapKulcs(kez[1]);
    if (!elso || !masodik || elso !== masodik) {
        return null;
    }

    return `${elso},${masodik}`;
}

function getStrategiaKod(state) {
    if (!state || !state.osztoKez || state.osztoKez.length === 0) {
        return null;
    }

    const dealerKulcs = normalizalLapKulcs(state.osztoKez[0]);
    const aktivKez = getAktivJatekosKez(state);
    if (!dealerKulcs || aktivKez.length === 0) {
        return null;
    }

    const parKulcs = getParSorKulcs(aktivKez);
    if (parKulcs && blackjackStrategia.pair[parKulcs]) {
        return blackjackStrategia.pair[parKulcs][dealerKulcs] || null;
    }

    const kezAllapot = szamolKezAllapot(aktivKez);
    if (kezAllapot.soft && kezAllapot.osszeg >= 13) {
        const softKulcs = getSoftSorKulcs(kezAllapot.osszeg);
        return blackjackStrategia.soft[softKulcs][dealerKulcs] || null;
    }

    const hardKulcs = getHardSorKulcs(kezAllapot.osszeg);
    return blackjackStrategia.hard[hardKulcs][dealerKulcs] || null;
}

function getStrategiaSzoveg(kod) {
    if (kod === 'H') return 'Húzás';
    if (kod === 'S') return 'Megállás';
    if (kod === 'P') return 'Szétválasztás';
    if (kod === 'D') return 'Duplázás';
    return 'N/A';
}

function getStrategiaKodClass(kod) {
    if (kod === 'H') return 'strategia-h';
    if (kod === 'S') return 'strategia-s';
    if (kod === 'P') return 'strategia-p';
    if (kod === 'D') return 'strategia-d';
    return 'strategia-semleges';
}

function getElerhetoLepesKodok(state) {
    const elerheto = [];
    if (!state || state.bust) {
        return elerheto;
    }

    const splitAktiv = !!(state.jatekosKez2 && state.jatekosKez2.length > 0);

    if (state.status === 'ongoing') {
        elerheto.push('H');
        elerheto.push('S');

        if (state.canDouble) {
            elerheto.push('D');
        }

        // Resplit nincs implementalva, split utan mar ne ajanljuk.
        if (state.canSplit && !splitAktiv) {
            elerheto.push('P');
        }
    } else if (state.status === 'stand_needed') {
        elerheto.push('S');
    }

    return elerheto;
}

function normalizalAjanlottKod(ajanlottKod, elerhetoKodok) {
    if (!elerhetoKodok || elerhetoKodok.length === 0) {
        return null;
    }

    if (ajanlottKod && elerhetoKodok.includes(ajanlottKod)) {
        return ajanlottKod;
    }

    if (ajanlottKod === 'D' && elerhetoKodok.includes('H')) {
        return 'H';
    }

    if (ajanlottKod === 'P' && elerhetoKodok.includes('H')) {
        return 'H';
    }

    if (elerhetoKodok.includes('S')) {
        return 'S';
    }

    return elerhetoKodok[0];
}

function frissitAjanlottGombHighlight(kod, panelAktiv) {
    const gombIdk = ['nextBtn', 'standBtn', 'doubleBtn', 'splitBtn'];
    for (let i = 0; i < gombIdk.length; i++) {
        const gomb = document.getElementById(gombIdk[i]);
        if (gomb) {
            gomb.classList.remove('ajanlott-lepes-gomb');
        }
    }

    if (!panelAktiv || !kod) {
        return;
    }

    let celId = '';
    if (kod === 'H') celId = 'nextBtn';
    if (kod === 'S') celId = 'standBtn';
    if (kod === 'D') celId = 'doubleBtn';
    if (kod === 'P') celId = 'splitBtn';

    if (!celId) {
        return;
    }

    const celGomb = document.getElementById(celId);
    if (celGomb) {
        celGomb.classList.add('ajanlott-lepes-gomb');
    }
}

function frissitLepesAjanlo(state) {
    const kodEl = document.getElementById('stat-action-code');
    const decisionEl = document.getElementById('stat-decision');
    if (!kodEl || !decisionEl) {
        return;
    }

    const strategiaKod = getStrategiaKod(state);
    const elerhetoKodok = getElerhetoLepesKodok(state);
    const kod = normalizalAjanlottKod(strategiaKod, elerhetoKodok);
    const szoveg = getStrategiaSzoveg(kod);

    kodEl.textContent = kod || '-';
    kodEl.className = 'strategia-chip';
    kodEl.classList.add(getStrategiaKodClass(kod));

    const splitAktiv = !!(state && state.jatekosKez2 && state.jatekosKez2.length > 0);
    if (splitAktiv) {
        kodEl.classList.add('ajanlas-split-highlight');
        decisionEl.classList.add('ajanlas-split-highlight');
    } else {
        kodEl.classList.remove('ajanlas-split-highlight');
        decisionEl.classList.remove('ajanlas-split-highlight');
    }

    const jatekTerulet = document.querySelector('.jatek-terulet');
    const panelAktiv = !!(jatekTerulet && jatekTerulet.classList.contains('statisztika-aktiv'));
    frissitAjanlottGombHighlight(kod, panelAktiv);

    decisionEl.textContent = `Legjobb döntés: ${szoveg}`;
}

// Statisztikák frissítése (placeholder - később backendről tölthető)
function updateStatisztikak(stats) {
    const winrateEl = document.getElementById('stat-winrate');
    const houseEl = document.getElementById('stat-house');
    const roiEl = document.getElementById('stat-roi');
    const sessionProfitEl = document.getElementById('stat-session-profit');
    const sessionRoundsEl = document.getElementById('stat-session-rounds');

    if (winrateEl) winrateEl.textContent = `Session győzelmi arány: ${stats.winrate ?? '0.0%'}`;
    if (houseEl) houseEl.textContent = `Átlagos ház előny: ${stats.houseEdge ?? 'N/A'}`;
    if (roiEl) roiEl.textContent = `Átlagos ROI: ${stats.roi ?? 'N/A'}`;
    if (sessionProfitEl) sessionProfitEl.textContent = `Session profit: ${stats.sessionProfit ?? '$0.00'}`;
    if (sessionRoundsEl) sessionRoundsEl.textContent = `Session körök: ${stats.sessionRounds ?? '0'}`;
}

// Inicializálás: toggle gomb esemény
document.addEventListener('DOMContentLoaded', () => {
    const statsBtn = document.getElementById('statsToggleBtn');
    if (statsBtn) {
        statsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleStatisztika();
        });
    }

    // Kezdeti állapot: panel rejtve
    setStatisztikaVisible(false);

    updateStatisztikak(statisztikaAdatok);
    frissitLepesAjanlo(null);
});
