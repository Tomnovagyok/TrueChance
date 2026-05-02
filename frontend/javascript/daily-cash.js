document.addEventListener('DOMContentLoaded', function () {
    const Fetch = async (url, method = 'GET', body = null) => {
        const options = { method: method };
        if (body) {
            options.headers = { 'Content-type': 'application/json' };
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        let adat = {};
        try {
            adat = await response.json();
        } catch (hiba) {
            adat = {};
        }

        if (!response.ok) {
            const error = new Error(adat.uzenet || 'Hiba: ' + response.status);
            error.status = response.status;
            error.hatralevoMasodperc = adat.hatralevoMasodperc;
            throw error;
        }

        return adat;
    };

    const nyeremenyek = [500, 1000, 2000, 5000];

    let forogMost = false;
    let porgetheto = false;
    let visszaszamlaloMasodperc = 0;
    let visszaszamlaloTimer = null;

    const dailyOpcioElemek = document.querySelectorAll('.daily-opcio');
    const dailyPorgetesBtn = document.getElementById('dailyPorgetesBtn');
    const dailyStatus = document.getElementById('dailyStatus');
    const dailyNyeremeny = document.getElementById('dailyNyeremeny');
    const navbarEgyenleg = document.getElementById('navbarEgyenleg');

    function idoFormat(masodperc) {
        const nap = Math.floor(masodperc / 86400);
        const ora = Math.floor((masodperc % 86400) / 3600);
        const perc = Math.floor((masodperc % 3600) / 60);
        const mp = masodperc % 60;

        if (nap > 0) {
            return nap + ' nap ' + String(ora).padStart(2, '0') + ':' + String(perc).padStart(2, '0') + ':' + String(mp).padStart(2, '0');
        }

        return String(ora).padStart(2, '0') + ':' + String(perc).padStart(2, '0') + ':' + String(mp).padStart(2, '0');
    }

    function porgetesGombFrissit() {
        dailyPorgetesBtn.disabled = forogMost || !porgetheto;
    }

    function egyenlegFrissit(egyenleg) {
        const egyenlegSzam = Number(egyenleg) || 0;
        if (navbarEgyenleg) {
            navbarEgyenleg.textContent = '$' + egyenlegSzam.toFixed(2);
        }
    }

    function nyeremenyUzenetMutat(szoveg, tipus) {
        dailyNyeremeny.textContent = szoveg;
        dailyNyeremeny.classList.remove('nyert', 'hiba');
        if (tipus === 'nyert') {
            dailyNyeremeny.classList.add('nyert');
        }
        if (tipus === 'hiba') {
            dailyNyeremeny.classList.add('hiba');
        }
    }

    function aktivOpcioKijelol(index) {
        for (let i = 0; i < dailyOpcioElemek.length; i++) {
            dailyOpcioElemek[i].classList.remove('aktiv');
        }

        if (index >= 0 && index < dailyOpcioElemek.length) {
            dailyOpcioElemek[index].classList.add('aktiv');
        }
    }

    function visszaszamlaloLeallit() {
        if (visszaszamlaloTimer) {
            clearInterval(visszaszamlaloTimer);
            visszaszamlaloTimer = null;
        }
    }

    function visszaszamlaloIndit(masodperc) {
        visszaszamlaloLeallit();
        visszaszamlaloMasodperc = Math.max(0, Number(masodperc) || 0);

        if (visszaszamlaloMasodperc <= 0) {
            porgetheto = true;
            dailyStatus.textContent = 'A pörgetés elérhető.';
            porgetesGombFrissit();
            return;
        }

        porgetheto = false;
        dailyStatus.textContent = 'Következő pörgetésig: ' + idoFormat(visszaszamlaloMasodperc);
        porgetesGombFrissit();

        visszaszamlaloTimer = setInterval(function () {
            visszaszamlaloMasodperc = visszaszamlaloMasodperc - 1;
            if (visszaszamlaloMasodperc <= 0) {
                visszaszamlaloLeallit();
                porgetheto = true;
                dailyStatus.textContent = 'A pörgetés elérhető.';
                porgetesGombFrissit();
                return;
            }

            dailyStatus.textContent = 'Következő pörgetésig: ' + idoFormat(visszaszamlaloMasodperc);
        }, 1000);
    }

    async function allapotBetolt() {
        const allapot = await Fetch('/api/daily-cash/allapot');
        egyenlegFrissit(allapot.egyenleg);
        visszaszamlaloIndit(allapot.hatralevoMasodperc);
    }

    function porgetesAnimacio(nyeremeny) {
        return new Promise(function (resolve) {
            if (!dailyOpcioElemek.length) {
                resolve();
                return;
            }

            let nyeremenyIndex = nyeremenyek.indexOf(nyeremeny);
            if (nyeremenyIndex < 0) {
                nyeremenyIndex = 0;
            }

            const teljesKorok = Math.floor(Math.random() * 3) + 3;
            const osszesLepes = teljesKorok * dailyOpcioElemek.length + nyeremenyIndex;
            let aktualisLepes = 0;

            const animacio = setInterval(function () {
                const index = aktualisLepes % dailyOpcioElemek.length;
                aktivOpcioKijelol(index);

                if (aktualisLepes >= osszesLepes) {
                    clearInterval(animacio);
                    resolve();
                    return;
                }

                aktualisLepes = aktualisLepes + 1;
            }, 120);
        });
    }

    dailyPorgetesBtn.addEventListener('click', async function () {
        if (forogMost || !porgetheto) {
            return;
        }

        forogMost = true;
        nyeremenyUzenetMutat('', '');
        porgetesGombFrissit();

        try {
            const valasz = await Fetch('/api/daily-cash/porgetes', 'POST');
            await porgetesAnimacio(valasz.nyeremeny);

            egyenlegFrissit(valasz.egyenleg);
            nyeremenyUzenetMutat('Nyertél: +$' + Number(valasz.nyeremeny).toFixed(0), 'nyert');
            visszaszamlaloIndit(valasz.hatralevoMasodperc);
        } catch (error) {
            if (error.status === 429) {
                visszaszamlaloIndit(error.hatralevoMasodperc);
            }
            nyeremenyUzenetMutat(error.message, 'hiba');
        }

        forogMost = false;
        porgetesGombFrissit();
    });

    allapotBetolt().catch(function (error) {
        dailyStatus.textContent = error.message || 'Hiba történt az állapot betöltésekor.';
        nyeremenyUzenetMutat('Frissítsd az oldalt és próbáld újra.', 'hiba');
        porgetesGombFrissit();
    });
});
