// ==================== UI & API KOMMUNIKÁCIÓ ====================

const PostMethodFetch = {
    post: async (url, data = {}) => {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`API Hiba: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API hiba:', error);
            throw error;
        }
    }
};

// Játék state
let gameState = {
    jatekosKez: [],
    osztoKez: [],
    jatekosKez2: [],
    osztoRejtett: true,
    kezIndex: 1,
    status: 'idle'
};

// Kártya megjelenítés
function kartyakep(lap) {
    return `<img src="../images/Kártyák/${lap.szimbolum}/${lap.szam}.png" class="kartya">`;
}

function hatlap() {
    return '<img src="../images/Kártyák/Backside.png" class="kartya">';
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
            jelenlegiKezEl.innerHTML =
                'Jelenlegi kéz: ' + (state.kezIndex === 1 ? 'Első' : 'Második');
        } else {
            jelenlegiKezEl.innerHTML = '';
        }
    }

    // Játékos pontjainak megjelenítése
    const jatekosOsszegEl = document.getElementById('jatekos_osszeg');
    if (jatekosOsszegEl) {
        const ertek1 = state.jatekosKez.length ? kezErtek(state.jatekosKez) : '-';
        const ertek2 = state.jatekosKez2.length ? kezErtek(state.jatekosKez2) : '';
        let szoveg = 'Játékos pont: ' + ertek1;
        if (state.jatekosKez2.length > 0) szoveg += ' | ' + ertek2;
        jatekosOsszegEl.innerHTML = szoveg;
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
        if (state.osztoRejtett) {
            osztoOsszegEl.innerHTML = 'Oszto pont: ?';
        } else {
            const pont =
                state.osztoPont !== undefined
                    ? state.osztoPont
                    : state.osztoKez.length
                      ? kezErtek(state.osztoKez)
                      : '-';
            osztoOsszegEl.innerHTML = 'Oszto pont: ' + pont;
        }
    }

    // Állapot szöveg
    const statusEl = document.getElementById('pontjaid');
    if (statusEl) {
        statusEl.innerHTML = state.eredmeny;
    }

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
        const state = await PostMethodFetch.post('/api/game/init');
        state.status = 'ongoing';
        updateUI(state);
        AutoStand();
    } catch (error) {
        console.error('Játék inicializálása sikertelen:', error);
    }
}

async function hit() {
    try {
        const state = await PostMethodFetch.post('/api/game/hit');
        updateUI(state);

        const aktualisKez = state.kezIndex === 1 ? state.jatekosKez : state.jatekosKez2;
        const normalHit21 =
            state.status === 'ongoing' &&
            state.jatekosKez2.length === 0 &&
            aktualisKez.length > 0 &&
            kezErtek(aktualisKez) === 21;

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
        const state = await PostMethodFetch.post('/api/game/double');
        updateUI(state);
        // Ha nincs kéz váltás, automatikusan megállunk
        if (!state.switchHand && state.status === 'stand_needed') {
            disableActionButtonsExceptReset();
            setTimeout(() => stand(), 500);
        }
    } catch (error) {
        console.error('Double sikertelen:', error);
    }
}

async function split() {
    try {
        const state = await PostMethodFetch.post('/api/game/split');
        updateUI(state);
    } catch (error) {
        console.error('Split sikertelen:', error);
    }
}

async function stand() {
    try {
        const state = await PostMethodFetch.post('/api/game/stand');
        updateUI(state);
    } catch (error) {
        console.error('Stand sikertelen:', error);
    }
}

async function reset() {
    try {
        // Reset a gombok
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) nextBtn.disabled = true;
        const doubleBtn = document.getElementById('doubleBtn');
        if (doubleBtn) doubleBtn.disabled = true;
        const splitBtn = document.getElementById('splitBtn');
        if (splitBtn) splitBtn.disabled = true;
        const standBtn = document.getElementById('standBtn');
        if (standBtn) standBtn.disabled = true;

        const kezEl = document.getElementById('kez');
        if (kezEl) kezEl.innerHTML = '';
        const osztoEl = document.getElementById('oszto');
        if (osztoEl) osztoEl.innerHTML = '';
        const statusEl = document.getElementById('pontjaid');
        if (statusEl) statusEl.innerHTML = 'Állapot: várakozás';
        const jatekosOsszegEl = document.getElementById('jatekos_osszeg');
        if (jatekosOsszegEl) jatekosOsszegEl.innerHTML = '';
        const osztoOsszegEl = document.getElementById('oszto_osszeg');
        if (osztoOsszegEl) osztoOsszegEl.innerHTML = '';
        const jelenlegiKezEl = document.getElementById('jelenlegi_kez');
        if (jelenlegiKezEl) jelenlegiKezEl.innerHTML = '';

        // Új játék kezdése
        initGame();
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

// Event listenrek
document.addEventListener('DOMContentLoaded', function () {
    const nextBtn = document.getElementById('nextBtn');
    const doubleBtn = document.getElementById('doubleBtn');
    const splitBtn = document.getElementById('splitBtn');
    const standBtn = document.getElementById('standBtn');
    const resetBtn = document.getElementById('resetBtn');

    if (nextBtn) nextBtn.addEventListener('click', hit);
    if (doubleBtn) doubleBtn.addEventListener('click', double);
    if (splitBtn) splitBtn.addEventListener('click', split);
    if (standBtn) standBtn.addEventListener('click', stand);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    // Kezdeti állapot
    reset();
});
