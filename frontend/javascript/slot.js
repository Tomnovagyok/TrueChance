// Nyerőgép (slot.html) kliens oldali vezérlése.
// Pörgetés indítása, tárcsák (oszlopok) animálása és a szimbólumok megállítása a backend eredményei alapján.
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

    // Slot gép szimbólumai képekkel
    const szimbolumok = [
        { nev: 'citrom', kep: '../img/Slot/Citrom.png', szorzo: 1.5, suly: 596 },
        { nev: 'eper', kep: '../img/Slot/Eper.png', szorzo: 2, suly: 245 },
        { nev: 'kiwi', kep: '../img/Slot/Kiwi.png', szorzo: 3, suly: 70 },
        { nev: 'ananasz', kep: '../img/Slot/Ananász.png', szorzo: 5, suly: 40 },
        { nev: 'sarkanygyumolcs', kep: '../img/Slot/Sárkánygyümölcs.png', szorzo: 8, suly: 30 },
        { nev: 'seven', kep: '../img/Slot/Seven.png', szorzo: 100, suly: 19 }
    ];

    const OSZLOP_SZAM = 5;
    const SZALAG_HOSSZ = 30;
    const LATHATO_SOROK = 3;

    // Pörgetési időzítések minden oszlophoz (ms)
    const PORGESI_IDO = [1500, 2000, 2500, 3000, 3500];

    // Animációs átmenetek
    const PORGESI_ATMENETEK = [
        'cubic-bezier(0.25, 0.1, 0.1, 1.0)',
        'cubic-bezier(0.25, 0.1, 0.1, 1.0)',
        'cubic-bezier(0.25, 0.1, 0.1, 1.0)',
        'cubic-bezier(0.25, 0.1, 0.1, 1.0)',
        'cubic-bezier(0.25, 0.1, 0.1, 1.0)'
    ];

    // Állapotváltozók
    let egyenleg = 0;
    let aktualisTet = 10;
    let forogMost = false;

    const statisztikaAdatok = {
        statikusHouseEdge: '0.0%',
        statikusRoi: '0.0%'
    };

    const sessionStatisztika = {
        osszesPorgetes: 0,
        nyeroPorgetesek: 0,
        osszTet: 0,
        osszNyeremeny: 0,
        sessionProfit: 0,
        legnagyobbNyeremeny: 0,
        nyeroKorokNyeremenyOsszeg: 0,
        leghosszabbVesztoSorozat: 0,
        aktualisVesztoSorozat: 0,
        utolsoNearMissManipulalt: null
    };

    // HTML elemek referenciái
    const spinGomb = document.getElementById('spinGomb');
    const spinGombKep = document.getElementById('spinGombKep');
    const tetOsszegInput = document.getElementById('tetOsszegInput');
    const infoPanelTet = document.getElementById('infoPanelTet');
    const infoPanelNyeremeny = document.getElementById('infoPanelNyeremeny');
    const infoPanelEgyenleg = document.getElementById('infoPanelEgyenleg');
    const statsToggleBtn = document.getElementById('statsToggleBtn');
    const gyorsGombok = document.querySelectorAll('.tet-gyors-gomb');

    // Inicializálás
    egyenlegBetolt();
    statisztikaAlapAdatBetolt();
    infoPanelTet.innerHTML = '$' + aktualisTet;
    setStatisztikaVisible(false);
    frissitStatisztikak();

    if (statsToggleBtn) {
        statsToggleBtn.addEventListener('click', function (event) {
            event.preventDefault();
            toggleStatisztika();
        });
    }

    // Felhasználó egyenlegének betöltése
    async function egyenlegBetolt() {
        try {
            const felhasznalo = await Fetch('/api/auth/me');
            const egyenlegSzam = Number(felhasznalo.egyenleg);
            if (!isNaN(egyenlegSzam)) {
                egyenleg = egyenlegSzam;
                frissitEgyenlegKijelzo();
            }
        } catch (error) {
            console.error('Egyenleg betöltési hiba:', error);
        }
    }

    async function statisztikaAlapAdatBetolt() {
        try {
            const adat = await Fetch('/api/slot/statisztika');

            if (!isNaN(Number(adat.statikusHouseEdgeSzazalek))) {
                statisztikaAdatok.statikusHouseEdge = formatSzazalek(Number(adat.statikusHouseEdgeSzazalek));
            }
            if (!isNaN(Number(adat.statikusRoiSzazalek))) {
                statisztikaAdatok.statikusRoi = formatSzazalek(Number(adat.statikusRoiSzazalek));
            }

            frissitStatisztikak();
        } catch (error) {
            console.error('Slot statisztikai alapadat betöltési hiba:', error);
        }
    }

    function frissitEgyenlegKijelzo() {
        infoPanelEgyenleg.innerHTML = '$' + egyenleg;

        const navbarEgyenleg = document.getElementById('navbarEgyenleg');
        if (navbarEgyenleg) {
            navbarEgyenleg.textContent = '$' + egyenleg;
        }
    }

    // Egy szimbólum elem magasságának lekérése
    function getElemMagassag() {
        const reel = document.getElementById('reel0');
        return reel.offsetHeight / LATHATO_SOROK;
    }

    // Szalagok feltöltése kezdeti szimbólumokkal
    for (let oszlopIndex = 0; oszlopIndex < OSZLOP_SZAM; oszlopIndex++) {
        szalagFeltolt(oszlopIndex);
    }

    // Súlyozott véletlen szimbólum választás
    function sulyozottRandom() {
        let osszesSuly = 0;
        for (let index = 0; index < szimbolumok.length; index++) {
            osszesSuly = osszesSuly + szimbolumok[index].suly;
        }

        const veletlen = Math.random() * osszesSuly;
        let folyoOsszeg = 0;

        for (let index = 0; index < szimbolumok.length; index++) {
            folyoOsszeg = folyoOsszeg + szimbolumok[index].suly;
            if (veletlen < folyoOsszeg) {
                return szimbolumok[index];
            }
        }

        return szimbolumok[0];
    }

    // Szalag feltöltése véletlen szimbólumokkal
    function szalagFeltolt(oszlopIndex) {
        const szalag = document.getElementById('szalag' + oszlopIndex);
        szalag.innerHTML = '';
        const magassag = getElemMagassag();

        for (let sorIndex = 0; sorIndex < LATHATO_SOROK; sorIndex++) {
            const szimbolum = sulyozottRandom();
            const elem = document.createElement('div');
            elem.classList.add('reel-gyumolcs');
            elem.style.height = magassag + 'px';
            elem.innerHTML = '<img src="' + szimbolum.kep + '" alt="' + szimbolum.nev + '" />';
            szalag.appendChild(elem);
        }
    }

    // Szimbólum keresése név alapján
    function getSzimbolumByNev(nev) {
        for (let index = 0; index < szimbolumok.length; index++) {
            if (szimbolumok[index].nev === nev) {
                return szimbolumok[index];
            }
        }
        return null;
    }

    function formatSzazalek(ertek) {
        if (ertek === null || ertek === undefined || isNaN(ertek)) {
            return '0.0%';
        }
        return `${Number(ertek).toFixed(1)}%`;
    }

    function formatPenz(ertek, abszolut = false) {
        if (ertek === null || ertek === undefined || isNaN(ertek)) {
            return '$0.00';
        }

        const absErtek = Math.abs(ertek).toFixed(2);
        if (abszolut) {
            return `$${absErtek}`;
        }

        if (ertek > 0) {
            return `+$${absErtek}`;
        }
        if (ertek < 0) {
            return `-$${absErtek}`;
        }
        return '$0.00';
    }

    function sessionTalalatiAranySzamol() {
        if (sessionStatisztika.osszesPorgetes === 0) {
            return 0;
        }

        return (sessionStatisztika.nyeroPorgetesek / sessionStatisztika.osszesPorgetes) * 100;
    }

    function sessionRtpSzamol() {
        if (sessionStatisztika.osszTet === 0) {
            return 0;
        }

        return (sessionStatisztika.osszNyeremeny / sessionStatisztika.osszTet) * 100;
    }

    function atlagNyeremenyNyerokoronkentSzamol() {
        if (sessionStatisztika.nyeroPorgetesek === 0) {
            return 0;
        }

        return sessionStatisztika.nyeroKorokNyeremenyOsszeg / sessionStatisztika.nyeroPorgetesek;
    }

    function frissitSessionStatisztika(tet, nyeremeny, nyert, nearMiss) {
        const tetSzam = Number(tet) || 0;
        const nyeremenySzam = Number(nyeremeny) || 0;

        sessionStatisztika.osszesPorgetes = sessionStatisztika.osszesPorgetes + 1;
        sessionStatisztika.osszTet = sessionStatisztika.osszTet + tetSzam;
        sessionStatisztika.osszNyeremeny = sessionStatisztika.osszNyeremeny + nyeremenySzam;
        sessionStatisztika.sessionProfit = sessionStatisztika.osszNyeremeny - sessionStatisztika.osszTet;

        if (nyert) {
            sessionStatisztika.nyeroPorgetesek = sessionStatisztika.nyeroPorgetesek + 1;
            sessionStatisztika.nyeroKorokNyeremenyOsszeg = sessionStatisztika.nyeroKorokNyeremenyOsszeg + nyeremenySzam;
            sessionStatisztika.aktualisVesztoSorozat = 0;
        } else {
            sessionStatisztika.aktualisVesztoSorozat = sessionStatisztika.aktualisVesztoSorozat + 1;
            if (sessionStatisztika.aktualisVesztoSorozat > sessionStatisztika.leghosszabbVesztoSorozat) {
                sessionStatisztika.leghosszabbVesztoSorozat = sessionStatisztika.aktualisVesztoSorozat;
            }
        }

        if (nyeremenySzam > sessionStatisztika.legnagyobbNyeremeny) {
            sessionStatisztika.legnagyobbNyeremeny = nyeremenySzam;
        }

        if (nearMiss && nearMiss.volt) {
            sessionStatisztika.utolsoNearMissManipulalt = true;
        } else {
            sessionStatisztika.utolsoNearMissManipulalt = false;
        }

        frissitStatisztikak();
    }

    function frissitStatisztikak() {
        const sessionSpinsEl = document.getElementById('stat-session-spins');
        const winningSpinsEl = document.getElementById('stat-winning-spins');
        const hitRateEl = document.getElementById('stat-hit-rate');
        const totalBetEl = document.getElementById('stat-total-bet');
        const totalWinEl = document.getElementById('stat-total-win');
        const sessionProfitEl = document.getElementById('stat-session-profit');
        const sessionRtpEl = document.getElementById('stat-session-rtp');
        const houseEdgeEl = document.getElementById('stat-house-edge');
        const roiEl = document.getElementById('stat-roi');
        const largestWinEl = document.getElementById('stat-largest-win');
        const averageWinEl = document.getElementById('stat-average-win');
        const longestLoseStreakEl = document.getElementById('stat-longest-lose-streak');
        const currentLoseStreakEl = document.getElementById('stat-current-lose-streak');
        const nearMissEl = document.getElementById('stat-nearmiss-manipulated');

        if (sessionSpinsEl) {
            sessionSpinsEl.textContent = `Összes pörgetés: ${sessionStatisztika.osszesPorgetes}`;
        }
        if (winningSpinsEl) {
            winningSpinsEl.textContent = `Nyerő pörgetések: ${sessionStatisztika.nyeroPorgetesek}`;
        }
        if (hitRateEl) {
            hitRateEl.textContent = `Találati arány: ${formatSzazalek(sessionTalalatiAranySzamol())}`;
        }
        if (totalBetEl) {
            totalBetEl.textContent = `Össztét: ${formatPenz(sessionStatisztika.osszTet, true)}`;
        }
        if (totalWinEl) {
            totalWinEl.textContent = `Össznyeremény: ${formatPenz(sessionStatisztika.osszNyeremeny, true)}`;
        }
        if (sessionProfitEl) {
            sessionProfitEl.textContent = `Profit/loss: ${formatPenz(sessionStatisztika.sessionProfit)}`;
            sessionProfitEl.classList.remove('stat-profit-pozitiv', 'stat-profit-negativ', 'stat-profit-null');
            if (sessionStatisztika.sessionProfit > 0) {
                sessionProfitEl.classList.add('stat-profit-pozitiv');
            } else if (sessionStatisztika.sessionProfit < 0) {
                sessionProfitEl.classList.add('stat-profit-negativ');
            } else {
                sessionProfitEl.classList.add('stat-profit-null');
            }
        }
        if (sessionRtpEl) {
            sessionRtpEl.textContent = `RTP: ${formatSzazalek(sessionRtpSzamol())}`;
        }
        if (houseEdgeEl) {
            houseEdgeEl.textContent = `Statikus ház előny: ${statisztikaAdatok.statikusHouseEdge}`;
        }
        if (roiEl) {
            roiEl.textContent = `Statikus ROI: ${statisztikaAdatok.statikusRoi}`;
        }
        if (largestWinEl) {
            largestWinEl.textContent = `Legnagyobb nyeremény: ${formatPenz(sessionStatisztika.legnagyobbNyeremeny, true)}`;
        }
        if (averageWinEl) {
            averageWinEl.textContent = `Átlagos nyeremény / nyerő kör: ${formatPenz(atlagNyeremenyNyerokoronkentSzamol(), true)}`;
        }
        if (longestLoseStreakEl) {
            longestLoseStreakEl.textContent = `Leghosszabb vesztes sorozat: ${sessionStatisztika.leghosszabbVesztoSorozat}`;
        }
        if (currentLoseStreakEl) {
            currentLoseStreakEl.textContent = `Current lose streak: ${sessionStatisztika.aktualisVesztoSorozat}`;
        }
        if (nearMissEl) {
            if (sessionStatisztika.utolsoNearMissManipulalt === null) {
                nearMissEl.textContent = 'Manipulált near miss: Nincs adat';
            } else {
                nearMissEl.textContent = `Manipulált near miss: ${sessionStatisztika.utolsoNearMissManipulalt ? 'Igen' : 'Nem'}`;
            }
        }
    }

    // Szalag pörgetése animációval
    function szalagPoroget(oszlopIndex, celIndex, callback) {
        const szalag = document.getElementById('szalag' + oszlopIndex);
        const elemMagassag = getElemMagassag();
        const celPozicio = -(celIndex * elemMagassag);

        szalag.style.transition = 'none';
        szalag.style.transform = 'translateY(0)';

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                szalag.style.transition = 'transform ' + PORGESI_IDO[oszlopIndex] + 'ms ' + PORGESI_ATMENETEK[oszlopIndex];
                szalag.style.transform = 'translateY(' + celPozicio + 'px)';

                setTimeout(function () {
                    if (callback) {
                        callback();
                    }
                }, PORGESI_IDO[oszlopIndex]);
            });
        });
    }

    spinGomb.addEventListener('click', async function () {
        if (forogMost) {
            return;
        }

        if (aktualisTet > egyenleg) {
            uzenetMutat('Nincs elég egyenleged!', 'vesztett');
            return;
        }

        forogMost = true;
        spinGomb.disabled = true;
        tetBemenetekLetiltasa(true);

        spinGombKep.parentElement.classList.add('lenyomva');
        setTimeout(function () {
            spinGombKep.parentElement.classList.remove('lenyomva');
        }, 200);

        infoPanelNyeremeny.innerHTML = '-';

        try {
            const inditottTet = aktualisTet;
            const adat = await Fetch('/api/slot/spin', 'POST', { tet: inditottTet });
            const eredmenyek = adat.eredmenyek;
            const nearMiss = adat.nearMiss || { volt: false, tipus: null };
            const nyeresInfo = {
                nyert: !!adat.nyert,
                nyeremeny: Number(adat.nyeremeny) || 0,
                szimbolum: adat.nyeresInfo.szimbolum,
                db: adat.nyeresInfo.db
            };

            // Tét levonása azonnal a pörgetés kezdetekor (a nyeremény csak a végén íródik jóvá)
            egyenleg = egyenleg - inditottTet;
            frissitEgyenlegKijelzo();
            
            const vegsoEgyenleg = Number(adat.egyenleg) || 0;

            const celIndexek = [];
            const magassag = getElemMagassag();

            for (let oszlopIndex = 0; oszlopIndex < OSZLOP_SZAM; oszlopIndex++) {
                const szalag = document.getElementById('szalag' + oszlopIndex);
                szalag.innerHTML = '';

                for (let kartyaIndex = 0; kartyaIndex < SZALAG_HOSSZ; kartyaIndex++) {
                    const elem = document.createElement('div');
                    elem.classList.add('reel-gyumolcs');
                    elem.style.height = magassag + 'px';

                    if (kartyaIndex === SZALAG_HOSSZ - 2) {
                        const celSzimbolum = getSzimbolumByNev(eredmenyek[oszlopIndex]);
                        elem.innerHTML = '<img src="' + celSzimbolum.kep + '" alt="' + celSzimbolum.nev + '" />';
                    } else {
                        const veletlen = sulyozottRandom();
                        elem.innerHTML = '<img src="' + veletlen.kep + '" alt="' + veletlen.nev + '" />';
                    }

                    szalag.appendChild(elem);
                }

                celIndexek.push(SZALAG_HOSSZ - 3);
            }

            let befejezettDb = 0;
            for (let oszlopIndex = 0; oszlopIndex < OSZLOP_SZAM; oszlopIndex++) {
                (function (aktualisOszlop) {
                    szalagPoroget(aktualisOszlop, celIndexek[aktualisOszlop], function () {
                        befejezettDb = befejezettDb + 1;
                        if (befejezettDb === OSZLOP_SZAM) {
                            eredmenyFeldolgoz(nyeresInfo, nearMiss, vegsoEgyenleg, inditottTet);
                        }
                    });
                })(oszlopIndex);
            }
        } catch (error) {
            uzenetMutat(error.message, 'vesztett');
            forogMost = false;
            spinGomb.disabled = false;
            tetBemenetekLetiltasa(false);
        }
    });

    // Eredmény feldolgozása és üzenet megjelenítése
    async function eredmenyFeldolgoz(nyeresInfo, nearMiss, vegsoEgyenleg, felhasznaltTet) {
        // Statisztika és végső egyenleg frissítése csak az animáció végén
        frissitSessionStatisztika(felhasznaltTet, nyeresInfo.nyeremeny, nyeresInfo.nyert, nearMiss);
        egyenleg = vegsoEgyenleg;
        frissitEgyenlegKijelzo();

        if (nyeresInfo.nyert) {
            const nyeremeny = Math.floor(nyeresInfo.nyeremeny);
            infoPanelNyeremeny.innerHTML = '+$' + nyeremeny;

            if (nyeresInfo.szimbolum === 'seven' && nyeresInfo.db >= 3) {
                uzenetMutat('JACKPOT! +$' + nyeremeny, 'jackpot-uzenet');
            } else {
                uzenetMutat('Nyertél! +$' + nyeremeny, 'nyert');
            }
        } else if (nearMiss.volt && nearMiss.tipus === 'majdnem-jackpot') {
            uzenetMutat('A 7-es majdnem kijött!', 'kozel');
        } else if (nearMiss.volt && nearMiss.tipus === 'kozel') {
            uzenetMutat('Majdnem! Próbáld újra!', 'kozel');
        } else {
            uzenetMutat('Vesztettél! -$' + felhasznaltTet, 'vesztett');
        }

        try {
            await Fetch('/api/slot/spin-finish', 'POST');
        } catch (error) {
            console.error('Hiba az animáció lezárása során:', error);
        }

        forogMost = false;
        spinGomb.disabled = false;
        tetBemenetekLetiltasa(false);
    }

    function setStatisztikaVisible(visible) {
        const slotKontener = document.querySelector('.slot-kontener');
        if (!slotKontener || !statsToggleBtn) {
            return;
        }

        if (visible) {
            slotKontener.classList.add('statisztika-aktiv');
            statsToggleBtn.classList.add('active');
        } else {
            slotKontener.classList.remove('statisztika-aktiv');
            statsToggleBtn.classList.remove('active');
        }

        frissitStatisztikak();
    }

    function toggleStatisztika() {
        const slotKontener = document.querySelector('.slot-kontener');
        if (!slotKontener) {
            return;
        }

        const aktiv = slotKontener.classList.contains('statisztika-aktiv');
        setStatisztikaVisible(!aktiv);
    }

    function tetBemenetekLetiltasa(letiltva) {
        tetOsszegInput.disabled = letiltva;
        for (let index = 0; index < gyorsGombok.length; index++) {
            gyorsGombok[index].disabled = letiltva;
        }
    }

    for (let gombIndex = 0; gombIndex < gyorsGombok.length; gombIndex++) {
        const gomb = gyorsGombok[gombIndex];
        gomb.addEventListener('click', function () {
            if (this.disabled || forogMost) {
                return;
            }
            aktualisTet = parseInt(this.dataset.ertek);
            tetOsszegInput.value = aktualisTet;
            infoPanelTet.innerHTML = '$' + aktualisTet;
        });
    }

    tetOsszegInput.addEventListener('input', function () {
        if (this.disabled || forogMost) {
            return;
        }
        const ertek = parseInt(this.value);
        if (!isNaN(ertek) && ertek > 0) {
            aktualisTet = ertek;
            infoPanelTet.innerHTML = '$' + aktualisTet;
        }
    });

    // Üzenet megjelenítése a képernyőn
    function uzenetMutat(szoveg, tipus) {
        const regi = document.querySelector('.eredmeny-uzenet');
        if (regi) {
            regi.remove();
        }

        const uzenet = document.createElement('div');
        uzenet.classList.add('eredmeny-uzenet', tipus);
        uzenet.innerHTML = szoveg;
        document.body.appendChild(uzenet);

        setTimeout(function () {
            uzenet.classList.add('latszik');
        }, 50);

        let idotartam = 2000;
        if (tipus === 'jackpot-uzenet') {
            idotartam = 3500;
        }

        setTimeout(function () {
            uzenet.classList.remove('latszik');
            setTimeout(function () {
                uzenet.remove();
            }, 350);
        }, idotartam);
    }
});
