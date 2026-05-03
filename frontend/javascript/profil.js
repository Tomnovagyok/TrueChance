// Profil oldal (profil.html) frontend logikája.
// Adatok betöltése, form validálás, jelszócsere és adatmódosítás küldése a backend felé.
document.addEventListener('DOMContentLoaded', async function () {

    // FormData-s fetch
    async function meghiv(url, method = 'GET', body = null) {
        try {
            const options = { method };
            if (body instanceof FormData) {
                options.body = body;
            } else if (body) {
                options.headers = { 'Content-Type': 'application/json' };
                options.body = body ? JSON.stringify(body) : null;
            }
            const response = await fetch(url, options);
            if (!response.ok) {
                const hibaAdat = await response.json().catch(() => ({}));
                throw new Error(hibaAdat.uzenet || 'Hiba: ' + response.status);
            }
            return response.json();
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // HTML elemek
    const loadingSpinner = document.getElementById('loadingSpinner');
    const profilTartalom = document.getElementById('profilTartalom');
    const mentesGomb = document.getElementById('mentesGomb');
    const profilUzenet = document.getElementById('profilUzenet');

    // Input mezők
    const profilNev = document.getElementById('profilNev');
    const profilEmail = document.getElementById('profilEmail');
    const profilLetrehozva = document.getElementById('profilLetrehozva');
    const profilRegNapok = document.getElementById('profilRegNapok');

    // Stat elemek
    const statEgyenleg = document.getElementById('statEgyenleg');
    const statOsszesJatek = document.getElementById('statOsszesJatek');
    const statEljatszott = document.getElementById('statEljatszott');
    const statNyert = document.getElementById('statNyert');
    const statVesztett = document.getElementById('statVesztett');
    const statProfit = document.getElementById('statProfit');
    const jatekEselyekKontener = document.getElementById('jatekEselyekKontener');

    // Játék nevek és ikonok
    const jatekNevek = {
        'slot': 'Slot',
        'roulette': 'Rulett',
        'blackjack': 'BlackJack',
        'poker': 'Póker'
    };

    const jatekIkonok = {
        'slot': 'fa-dice',
        'roulette': 'fa-circle-notch',
        'blackjack': 'fa-diamond',
        'poker': 'fa-heart'
    };

    const jatekSzinek = {
        'slot': '#ffd700',
        'roulette': '#ff4757',
        'blackjack': '#2ed573',
        'poker': '#8c5cff'
    };

    // Profil adatok betöltése
    try {
        const adat = await meghiv('/api/profile/adatok');
        const profil = adat.profil;

        loadingSpinner.style.display = 'none';
        profilTartalom.style.display = 'block';

        profilKitolt(profil);
    } catch (error) {
        console.error('Profil betöltési hiba:', error);
        loadingSpinner.style.display = 'none';

        const hibaDiv = document.createElement('div');
        hibaDiv.classList.add('alert', 'alert-danger', 'text-center');
        const hibaIkon = document.createElement('i');
        hibaIkon.classList.add('fas', 'fa-exclamation-triangle', 'me-2');
        hibaDiv.appendChild(hibaIkon);
        hibaDiv.appendChild(document.createTextNode('Hiba történt a profil betöltése közben.'));
        document.querySelector('.container').appendChild(hibaDiv);
    }

    // Profil adatok kitöltése a DOM-ba
    function profilKitolt(profil) {
        // Személyes adatok
        profilNev.value = profil.nev;
        profilEmail.value = profil.email;

        const letrehozva = new Date(profil.letrehozva);
        profilLetrehozva.value = letrehozva.toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        profilRegNapok.value = profil.regisztraltNapok + ' nap';

        // Összesített statisztikák
        statEgyenleg.textContent = '$' + profil.egyenleg.toFixed(2);
        statOsszesJatek.textContent = profil.osszesJatek;
        statEljatszott.textContent = '$' + profil.osszesEljatszottPenz.toFixed(2);
        statNyert.textContent = '$' + profil.osszesNyertPenz.toFixed(2);
        statVesztett.textContent = '$' + profil.osszesVesztettPenz.toFixed(2);

        // Profit / Veszteség
        const profit = profil.osszesNyertPenz - profil.osszesVesztettPenz;
        if (profit > 0) {
            statProfit.textContent = '+$' + profit.toFixed(2);
            statProfit.classList.add('nyert-szin');
        } else if (profit < 0) {
            statProfit.textContent = '-$' + Math.abs(profit).toFixed(2);
            statProfit.classList.add('vesztett-szin');
        } else {
            statProfit.textContent = '$0.00';
        }

        // Játékonkénti nyerési esélyek
        jatekEselyekKirajzol(profil.jatekNyeresiEselyek);
    }

    // Játékonkénti nyerési esélyek kirajzolása
    function jatekEselyekKirajzol(eselyek) {
        jatekEselyekKontener.innerHTML = '';

        const jatekTipusok = ['slot', 'roulette', 'blackjack', 'poker'];

        for (let i = 0; i < jatekTipusok.length; i++) {
            const tipus = jatekTipusok[i];
            const adat = eselyek[tipus];
            const nev = jatekNevek[tipus];
            const ikon = jatekIkonok[tipus];
            const szin = jatekSzinek[tipus];

            const col = document.createElement('div');
            col.classList.add('col-sm-6');

            const doboz = document.createElement('div');
            doboz.classList.add('esely-doboz');

            // Fejléc sor: ikon + név
            const fejlec = document.createElement('div');
            fejlec.classList.add('esely-fejlec');

            const ikonElem = document.createElement('i');
            ikonElem.classList.add('fas', ikon);
            ikonElem.style.color = szin;

            const nevElem = document.createElement('span');
            nevElem.classList.add('esely-nev');
            nevElem.textContent = nev;

            fejlec.appendChild(ikonElem);
            fejlec.appendChild(nevElem);
            doboz.appendChild(fejlec);

            // Nyerési arány progress bar
            const progressKontener = document.createElement('div');
            progressKontener.classList.add('esely-progress-kontener');

            const progressBar = document.createElement('div');
            progressBar.classList.add('esely-progress-bar');

            const progressKitoltes = document.createElement('div');
            progressKitoltes.classList.add('esely-progress-kitoltes');
            progressKitoltes.style.width = adat.nyeresiArany + '%';
            progressKitoltes.style.background = szin;

            progressBar.appendChild(progressKitoltes);
            progressKontener.appendChild(progressBar);

            const szazalek = document.createElement('span');
            szazalek.classList.add('esely-szazalek');
            szazalek.textContent = adat.nyeresiArany + '%';
            progressKontener.appendChild(szazalek);

            doboz.appendChild(progressKontener);

            // Körök info
            const korokInfo = document.createElement('div');
            korokInfo.classList.add('esely-korok');
            korokInfo.textContent = adat.nyertKor + ' / ' + adat.osszesKor + ' kör nyertes';

            doboz.appendChild(korokInfo);

            col.appendChild(doboz);
            jatekEselyekKontener.appendChild(col);
        }
    }

    // Mentés gomb - FormData-val küldi az adatokat
    mentesGomb.addEventListener('click', async function () {
        const formData = new FormData();
        formData.append('nev', profilNev.value);
        formData.append('email', profilEmail.value);

        mentesGomb.disabled = true;
        mentesGomb.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Mentés...';

        try {
            const valasz = await meghiv('/api/profile/frissites', 'PUT', formData);

            // Sikeres mentés üzenet
            uzenetMutat(valasz.uzenet, 'siker');

            // Frissítjük a profil adatokat a válaszból
            if (valasz.profil) {
                profilKitolt(valasz.profil);
            }

            // Navbar név frissítése
            const navProfilNev = document.querySelector('.profil-nev');
            if (navProfilNev) {
                navProfilNev.textContent = profilNev.value;
            }
        } catch (error) {
            uzenetMutat(error.message, 'hiba');
        }

        mentesGomb.disabled = false;
        mentesGomb.innerHTML = '<i class="fas fa-save me-2"></i>Mentés';
    });

    // Üzenet megjelenítése
    function uzenetMutat(szoveg, tipus) {
        profilUzenet.style.display = 'block';
        profilUzenet.textContent = szoveg;
        profilUzenet.className = 'profil-uzenet';

        if (tipus === 'siker') {
            profilUzenet.classList.add('profil-uzenet-siker');
        } else {
            profilUzenet.classList.add('profil-uzenet-hiba');
        }

        // 4 másodperc után eltűnik
        setTimeout(function () {
            profilUzenet.style.display = 'none';
        }, 4000);
    }

    // Jelszó mentés gomb
    const jelszoMentesGomb = document.getElementById('jelszoMentesGomb');
    const jelenlegiJelszo = document.getElementById('jelenlegiJelszo');
    const ujJelszo = document.getElementById('ujJelszo');
    const ujJelszoIsmet = document.getElementById('ujJelszoIsmet');

    jelszoMentesGomb.addEventListener('click', async function () {
        const jelenlegi = jelenlegiJelszo.value;
        const uj = ujJelszo.value;
        const ujIsmet = ujJelszoIsmet.value;

        if (!jelenlegi || !uj) {
            uzenetMutat('A jelenlegi és az új jelszó megadása is kötelező.', 'hiba');
            return;
        }

        if (uj.length < 6) {
            uzenetMutat('Az új jelszónak legalább 6 karakter hosszúnak kell lennie.', 'hiba');
            return;
        }

        if (uj !== ujIsmet) {
            uzenetMutat('A két új jelszó nem egyezik meg.', 'hiba');
            return;
        }

        const formData = new FormData();
        formData.append('jelenlegiJelszo', jelenlegi);
        formData.append('ujJelszo', uj);

        jelszoMentesGomb.disabled = true;
        jelszoMentesGomb.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Mentés...';

        try {
            const valasz = await meghiv('/api/profile/jelszo-valtoztatas', 'PUT', formData);
            uzenetMutat(valasz.uzenet, 'siker');

            // Mezők törlése sikeres mentés után
            jelenlegiJelszo.value = '';
            ujJelszo.value = '';
            ujJelszoIsmet.value = '';
        } catch (error) {
            uzenetMutat(error.message, 'hiba');
        }

        jelszoMentesGomb.disabled = false;
        jelszoMentesGomb.innerHTML = '<i class="fas fa-key me-2"></i>Jelszó mentése';
    });

    // Jelszó szem ikon működése
    const jelszoSzemGombok = document.querySelectorAll('.jelszo-szem-gomb');
    for (let i = 0; i < jelszoSzemGombok.length; i++) {
        jelszoSzemGombok[i].addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const ikon = this.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                ikon.classList.remove('fa-eye');
                ikon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                ikon.classList.remove('fa-eye-slash');
                ikon.classList.add('fa-eye');
            }
        });
    }
});
