document.addEventListener('DOMContentLoaded', async function () {
    async function meghiv(url, method = 'GET', body = null) {
        try {
            const options = { method: method };

            if (body) {
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify(body);
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

    const loadingSpinner = document.getElementById('loadingSpinner');
    const ranglistaTartalom = document.getElementById('ranglistaTartalom');
    const uresAllapot = document.getElementById('uresAllapot');
    const ranglistaTablaBody = document.getElementById('ranglistaTablaBody');

    function ranglistaKirajzol(felhasznalok) {
        ranglistaTablaBody.innerHTML = '';

        for (let index = 0; index < felhasznalok.length; index++) {
            const felhasznalo = felhasznalok[index];
            const sor = document.createElement('tr');

            const helyezesCell = document.createElement('td');
            const helyezesBadge = document.createElement('span');
            helyezesBadge.classList.add('helyezes-badge');
            helyezesBadge.textContent = '#' + (index + 1);
            helyezesCell.appendChild(helyezesBadge);
            sor.appendChild(helyezesCell);

            const nevCell = document.createElement('td');
            nevCell.textContent = felhasznalo.nev;
            sor.appendChild(nevCell);

            const egyenlegCell = document.createElement('td');
            egyenlegCell.classList.add('egyenleg-oszlop');
            egyenlegCell.textContent = '$' + Number(felhasznalo.egyenleg).toFixed(2);
            sor.appendChild(egyenlegCell);

            ranglistaTablaBody.appendChild(sor);
        }
    }

    try {
        const valasz = await meghiv('/api/ranglista/felhasznalok');
        const felhasznalok = valasz.felhasznalok || [];

        loadingSpinner.style.display = 'none';

        if (!felhasznalok.length) {
            uresAllapot.style.display = 'block';
            return;
        }

        ranglistaKirajzol(felhasznalok);
        ranglistaTartalom.style.display = 'block';
    } catch (error) {
        loadingSpinner.style.display = 'none';

        const hibaDiv = document.createElement('div');
        hibaDiv.classList.add('alert', 'alert-danger', 'text-center');
        const hibaIkon = document.createElement('i');
        hibaIkon.classList.add('fas', 'fa-exclamation-triangle', 'me-2');
        hibaDiv.appendChild(hibaIkon);
        hibaDiv.appendChild(document.createTextNode(error.message || 'Hiba történt a ranglista betöltése közben.'));
        document.querySelector('.container').appendChild(hibaDiv);
    }
});
