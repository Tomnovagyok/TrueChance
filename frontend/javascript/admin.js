document.addEventListener('DOMContentLoaded', async function () {
    async function meghiv(url, method = 'GET', body = null) {
        try {
            const options = { method };
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
    const adminTartalom = document.getElementById('adminTartalom');
    const adminUzenet = document.getElementById('adminUzenet');
    const felhasznaloTablaBody = document.getElementById('felhasznaloTablaBody');
    const mentesGomb = document.getElementById('felhasznaloMentesGomb');

    const modalFelhasznaloId = document.getElementById('modalFelhasznaloId');
    const modalFelhasznaloNev = document.getElementById('modalFelhasznaloNev');
    const modalFelhasznaloEmail = document.getElementById('modalFelhasznaloEmail');
    const modalFelhasznaloEgyenleg = document.getElementById('modalFelhasznaloEgyenleg');
    const modalFelhasznaloAdminE = document.getElementById('modalFelhasznaloAdminE');
    const modalFelhasznaloJelszo = document.getElementById('modalFelhasznaloJelszo');

    const modalElem = document.getElementById('felhasznaloSzerkesztesModal');
    const szerkesztesModal = new bootstrap.Modal(modalElem);

    let felhasznalok = [];
    let aktualisAdminId = null;

    function uzenetMutat(szoveg, tipus) {
        adminUzenet.style.display = 'block';
        adminUzenet.textContent = szoveg;
        adminUzenet.className = 'admin-uzenet ' + tipus;

        setTimeout(function () {
            adminUzenet.style.display = 'none';
        }, 4000);
    }

    function tablazatKirajzol() {
        felhasznaloTablaBody.innerHTML = '';

        for (let i = 0; i < felhasznalok.length; i++) {
            const felhasznalo = felhasznalok[i];
            const sor = document.createElement('tr');

            const adminBadgeClass = felhasznalo.adminE ? 'igen' : 'nem';
            const adminBadgeText = felhasznalo.adminE ? 'Igen' : 'Nem';

            const idCell = document.createElement('td');
            idCell.textContent = felhasznalo.id;
            sor.appendChild(idCell);

            const nevCell = document.createElement('td');
            nevCell.textContent = felhasznalo.nev;
            sor.appendChild(nevCell);

            const emailCell = document.createElement('td');
            emailCell.textContent = felhasznalo.email;
            sor.appendChild(emailCell);

            const egyenlegCell = document.createElement('td');
            egyenlegCell.textContent = '$' + Number(felhasznalo.egyenleg).toFixed(2);
            sor.appendChild(egyenlegCell);

            const adminCell = document.createElement('td');
            const adminBadge = document.createElement('span');
            adminBadge.classList.add('admin-badge', adminBadgeClass);
            adminBadge.textContent = adminBadgeText;
            adminCell.appendChild(adminBadge);
            sor.appendChild(adminCell);

            const muveletCell = document.createElement('td');
            const szerkesztesGomb = document.createElement('button');
            szerkesztesGomb.type = 'button';
            szerkesztesGomb.classList.add('btn', 'btn-glass-primary', 'btn-sm', 'szerkesztes-gomb');
            szerkesztesGomb.setAttribute('data-id', String(felhasznalo.id));
            szerkesztesGomb.innerHTML = '<i class="fas fa-pen me-1"></i>Szerkesztés';
            muveletCell.appendChild(szerkesztesGomb);
            sor.appendChild(muveletCell);

            felhasznaloTablaBody.appendChild(sor);
        }
    }

    function szerkesztesModalKitolt(felhasznalo) {
        modalFelhasznaloId.value = felhasznalo.id;
        modalFelhasznaloNev.value = felhasznalo.nev;
        modalFelhasznaloEmail.value = felhasznalo.email;
        modalFelhasznaloEgyenleg.value = Number(felhasznalo.egyenleg).toFixed(2);
        modalFelhasznaloAdminE.checked = !!felhasznalo.adminE;
        modalFelhasznaloJelszo.value = '';

        const sajatFiokE = Number(felhasznalo.id) === Number(aktualisAdminId);
        modalFelhasznaloAdminE.disabled = sajatFiokE;
        if (sajatFiokE) {
            modalFelhasznaloAdminE.title = 'Saját admin jogosultságod nem módosítható.';
        } else {
            modalFelhasznaloAdminE.removeAttribute('title');
        }
    }

    async function felhasznalokBetolt() {
        const valasz = await meghiv('/api/admin/felhasznalok');
        felhasznalok = valasz.felhasznalok || [];
        tablazatKirajzol();
        loadingSpinner.style.display = 'none';
        adminTartalom.style.display = 'block';
    }

    try {
        const aktualisFelhasznalo = await meghiv('/api/auth/me');
        if (!aktualisFelhasznalo.adminE) {
            window.location.replace('/html/games.html');
            return;
        }
        aktualisAdminId = Number(aktualisFelhasznalo.id);
    } catch (error) {
        window.location.replace('/html/auth.html');
        return;
    }

    try {
        await felhasznalokBetolt();
    } catch (error) {
        loadingSpinner.style.display = 'none';
        uzenetMutat(error.message || 'Hiba történt a felhasználók betöltése közben.', 'hiba');
    }

    felhasznaloTablaBody.addEventListener('click', function (event) {
        const szerkesztesGomb = event.target.closest('.szerkesztes-gomb');
        if (!szerkesztesGomb) {
            return;
        }

        const felhasznaloId = Number(szerkesztesGomb.getAttribute('data-id'));
        const felhasznalo = felhasznalok.find(function (sor) {
            return Number(sor.id) === felhasznaloId;
        });

        if (!felhasznalo) {
            uzenetMutat('A felhasználó már nem található.', 'hiba');
            return;
        }

        szerkesztesModalKitolt(felhasznalo);
        szerkesztesModal.show();
    });

    mentesGomb.addEventListener('click', async function () {
        const felhasznaloId = Number(modalFelhasznaloId.value);
        const szerkesztettFelhasznalo = felhasznalok.find(function (sor) {
            return Number(sor.id) === felhasznaloId;
        });

        if (!szerkesztettFelhasznalo) {
            uzenetMutat('A felhasználó már nem található.', 'hiba');
            return;
        }

        let adminE = modalFelhasznaloAdminE.checked;
        if (felhasznaloId === Number(aktualisAdminId)) {
            adminE = !!szerkesztettFelhasznalo.adminE;
        }

        const adat = {
            nev: modalFelhasznaloNev.value,
            email: modalFelhasznaloEmail.value,
            egyenleg: Number(modalFelhasznaloEgyenleg.value),
            adminE: adminE,
            jelszo: modalFelhasznaloJelszo.value
        };

        mentesGomb.disabled = true;
        mentesGomb.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Mentés...';

        try {
            const valasz = await meghiv('/api/admin/felhasznalo/' + felhasznaloId, 'PUT', adat);
            await felhasznalokBetolt();
            szerkesztesModal.hide();
            uzenetMutat(valasz.uzenet || 'Felhasználó mentve.', 'siker');
        } catch (error) {
            uzenetMutat(error.message || 'Sikertelen mentés.', 'hiba');
        }

        mentesGomb.disabled = false;
        mentesGomb.innerHTML = '<i class="fas fa-save me-2"></i>Mentés';
    });

    //! Jelszó szem ikon működése
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
