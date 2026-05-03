document.addEventListener('DOMContentLoaded', async function () {
    
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

    // HTML elemek
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');
    const statsTable = document.getElementById('statsTable');

    // Játék típusok nevei magyarul
    const jatekNevek = {
        'slot': 'Slot',
        'roulette': 'Rulett',
        'blackjack': 'BlackJack',
        'poker': 'Póker'
    };

    // Játék típusok ikonjai
    const jatekIkonok = {
        'slot': 'fa-dice',
        'roulette': 'fa-circle-notch',
        'blackjack': 'fa-diamond',
        'poker': 'fa-heart'
    };

    try {
        // Játékmenetek lekérése a szervertől
        const adat = await Fetch('/api/stats/jatekmenetek');
        const jatekmenetek = adat.jatekmenetek;

        // Betöltés animáció elrejtése
        loadingSpinner.style.display = 'none';

        // Ha nincs még játékmenet
        if (jatekmenetek.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        // Játékmenetek megjelenítése
        statsTable.style.display = 'block';
        renderJatekmenetek(jatekmenetek);

    } catch (error) {
        console.error('Statisztika betöltési hiba:', error);
        loadingSpinner.style.display = 'none';
        
        // Hiba megjelenítése
        const hibaDiv = document.createElement('div');
        hibaDiv.classList.add('alert', 'alert-danger');
        hibaDiv.setAttribute('role', 'alert');

        const hibaIkon = document.createElement('i');
        hibaIkon.classList.add('fas', 'fa-exclamation-triangle', 'me-2');

        hibaDiv.appendChild(hibaIkon);
        hibaDiv.appendChild(document.createTextNode('Hiba történt a statisztikák betöltése közben. Próbáld újra később.'));

        statsTable.appendChild(hibaDiv);
        statsTable.style.display = 'block';
    }

    function renderJatekmenetek(jatekmenetek) {
        const csoportok = {};

        for (let i = 0; i < jatekmenetek.length; i++) {
            const menet = jatekmenetek[i];
            const datum = new Date(menet.jatszva).toLocaleDateString('hu-HU');

            if (!csoportok[datum]) {
                csoportok[datum] = [];
            }

            csoportok[datum].push(menet);
        }

        statsTable.innerHTML = '';

        const datumok = Object.keys(csoportok);

        for (let i = 0; i < datumok.length; i++) {
            const datum = datumok[i];
            const napi = csoportok[datum];

            const datumCsoport = document.createElement('div');
            datumCsoport.classList.add('datum-csoport');

            const datumFejlec = document.createElement('div');
            datumFejlec.classList.add('datum-fejlec');

            const datumIkon = document.createElement('i');
            datumIkon.classList.add('fas', 'fa-calendar-day', 'me-2');

            const datumSzoveg = document.createElement('span');
            datumSzoveg.innerHTML = datum;

            datumFejlec.appendChild(datumIkon);
            datumFejlec.appendChild(datumSzoveg);
            datumCsoport.appendChild(datumFejlec);

            const tableWrapper = document.createElement('div');
            tableWrapper.classList.add('table-responsive');

            const table = document.createElement('table');
            table.classList.add('table', 'table-hover', 'stats-tabla-tabla');

            const thead = document.createElement('thead');
            const theadRow = document.createElement('tr');

            const fejlecek = ['Játék', 'Tét', 'Nyeremény', 'Eredmény', 'Egyenleg előtte', 'Egyenleg utána', 'Időpont'];
            for (let k = 0; k < fejlecek.length; k++) {
                const th = document.createElement('th');
                th.innerHTML = fejlecek[k];
                theadRow.appendChild(th);
            }

            thead.appendChild(theadRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');

            for (let j = 0; j < napi.length; j++) {
                const menet = napi[j];

                const jatekNev = jatekNevek[menet.jatek_tipus] || menet.jatek_tipus;
                const jatekIkon = jatekIkonok[menet.jatek_tipus] || 'fa-gamepad';

                const tet = parseFloat(menet.tet_osszeg);
                const nyeremeny = parseFloat(menet.nyeremeny);
                const egyenlegUtan = parseFloat(menet.egyenleg_utan);

                let egyenlegElotte;
                let eredmeny;
                let megjelenitetNyeremeny;

                if (menet.jatek_tipus === 'poker') {
                    const nyertAKor = nyeremeny > 0;

                    if (nyertAKor) {
                        egyenlegElotte = egyenlegUtan - nyeremeny + tet;
                        eredmeny = tet;
                        megjelenitetNyeremeny = nyeremeny; // pot
                    } else {
                        egyenlegElotte = egyenlegUtan + tet;
                        eredmeny = -tet;
                        megjelenitetNyeremeny = '-'; // veszteségnél csak szimpla -
                    }
                } else {
                    egyenlegElotte = egyenlegUtan + tet - nyeremeny;
                    eredmeny = nyeremeny - tet;
                    megjelenitetNyeremeny = nyeremeny;
                }

                let eredmenyClass = '';
                let eredmenyText = '';
                let eredmenyIkon = '';

                if (eredmeny > 0) {
                    eredmenyClass = 'nyert';
                    eredmenyText = '+$' + eredmeny.toFixed(2);
                    eredmenyIkon = 'fa-arrow-up';
                } else if (eredmeny < 0) {
                    eredmenyClass = 'vesztett';
                    eredmenyText = '-$' + Math.abs(eredmeny).toFixed(2);
                    eredmenyIkon = 'fa-arrow-down';
                } else {
                    eredmenyClass = 'dontetlen';
                    eredmenyText = '$0.00';
                    eredmenyIkon = 'fa-minus';
                }

                const idopont = new Date(menet.jatszva).toLocaleTimeString('hu-HU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const row = document.createElement('tr');

                const jatekCell = document.createElement('td');
                const jatekIkonElem = document.createElement('i');
                jatekIkonElem.classList.add('fas', jatekIkon, 'me-2');
                jatekCell.appendChild(jatekIkonElem);
                jatekCell.appendChild(document.createTextNode(jatekNev));
                row.appendChild(jatekCell);

                const tetCell = document.createElement('td');
                tetCell.innerHTML = '$' + tet.toFixed(2);
                row.appendChild(tetCell);

                const nyeremenyCell = document.createElement('td');
                if (megjelenitetNyeremeny === '-') {
                    nyeremenyCell.innerHTML = '-';
                } else {
                    nyeremenyCell.innerHTML = '$' + megjelenitetNyeremeny.toFixed(2);
                }
                row.appendChild(nyeremenyCell);

                const eredmenyCell = document.createElement('td');
                const eredmenyBadge = document.createElement('span');
                eredmenyBadge.classList.add('eredmeny-badge', eredmenyClass);

                const eredmenyIkonElem = document.createElement('i');
                eredmenyIkonElem.classList.add('fas', eredmenyIkon, 'me-1');

                eredmenyBadge.appendChild(eredmenyIkonElem);
                eredmenyBadge.appendChild(document.createTextNode(eredmenyText));
                eredmenyCell.appendChild(eredmenyBadge);
                row.appendChild(eredmenyCell);

                const egyenlegElotteCell = document.createElement('td');
                egyenlegElotteCell.classList.add('text-muted');
                egyenlegElotteCell.innerHTML = '$' + egyenlegElotte.toFixed(2);
                row.appendChild(egyenlegElotteCell);

                const egyenlegUtanaCell = document.createElement('td');
                egyenlegUtanaCell.innerHTML = '$' + parseFloat(menet.egyenleg_utan).toFixed(2);
                row.appendChild(egyenlegUtanaCell);

                const idopontCell = document.createElement('td');
                idopontCell.classList.add('text-muted');
                idopontCell.innerHTML = idopont;
                row.appendChild(idopontCell);

                tbody.appendChild(row);
            }

            table.appendChild(tbody);

            tableWrapper.appendChild(table);

            datumCsoport.appendChild(tableWrapper);

            statsTable.appendChild(datumCsoport);
        }
    }
});
