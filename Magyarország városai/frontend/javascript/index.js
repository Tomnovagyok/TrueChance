document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await Fetch('/api/getallvtip');
        console.log(data);

        let select = document.getElementById('vtipSelect');

        data.results.forEach((vtip) => {
            const option = document.createElement('option');
            option.value = vtip.id;
            option.textContent = vtip.vtip;
            select.appendChild(option);
        });

        let vtipBtn = document.getElementById('vtipBtn');

        let hova = document.getElementById('varosBody');

        vtipBtn.addEventListener('click', async () => {
            hova.innerHTML = '';
            let kivalasztott = select.value;
            const data = await Fetch(`/api/getallvip/${kivalasztott}`);
            console.log(data);

            data.results.forEach((varos) => {
                let tr = document.createElement('tr');
                tr.dataset.id = varos.id; //!KELL ID A SOR-NAK
                hova.appendChild(tr);

                let td = document.createElement('td');
                td.innerHTML = varos.vnev;
                tr.appendChild(td);

                td = document.createElement('td');
                td.innerHTML = varos.jaras;
                tr.appendChild(td);

                td = document.createElement('td');
                td.innerHTML = varos.kisterseg;
                tr.appendChild(td);

                td = document.createElement('td');
                td.innerHTML = varos.nepesseg;
                tr.appendChild(td);

                td = document.createElement('td');
                td.innerHTML = varos.terulet;
                tr.appendChild(td);
            });

            selectTr();
        });

        let selectVarosBtn = document.getElementById('selectVarosBtn');

        selectVarosBtn.addEventListener('click', async () => {
            const form = document.getElementById('varosForm'); //!hogy később tudjunk id-t adni a form-nak
            const vnevInput = document.getElementById('vnev');
            const jarasInput = document.getElementById('jaras');
            const kistersegInput = document.getElementById('kisterseg');
            const nepessegInput = document.getElementById('nepesseg');
            const teruletInput = document.getElementById('terulet');

            const tbody = document.getElementById('varosBody');

            for (const tr of tbody.children) {
                if (tr.dataset.selected == 'true') {
                    //!a kiválasztott sor id-je a form id-jába
                    form.dataset.selectedid = tr.dataset.id;

                    for (const td of tr.children) {
                        vnevInput.value = tr.children[0].textContent;
                        jarasInput.value = tr.children[1].textContent;
                        kistersegInput.value = tr.children[2].textContent;
                        nepessegInput.value = tr.children[3].textContent;
                        teruletInput.value = tr.children[4].textContent;
                    }
                }
            }
        });

        let editVarosBtn = document.getElementById('editVarosBtn');

        editVarosBtn.addEventListener('click', async () => {
            let form = document.getElementById('varosForm');
            let vnevInput = document.getElementById('vnev');
            let jarasInput = document.getElementById('jaras');
            let kistersegInput = document.getElementById('kisterseg');
            let nepessegInput = document.getElementById('nepesseg');
            let teruletInput = document.getElementById('terulet');

            const selectedId = form.dataset.selectedid; //!a kiválasztott sor id-ja = form id-ja
            if (!selectedId) {
                //ha nincs kiválasztva város
                alert('Nincs kiválasztott város szerkesztésre.');
                return;
            }

            const formData = new FormData();
            //kulcs - érték párok
            formData.append('vnev', vnevInput.value);
            formData.append('jaras', jarasInput.value);
            formData.append('kisterseg', kistersegInput.value);
            formData.append('nepesseg', nepessegInput.value);
            formData.append('terulet', teruletInput.value);
            formData.append('id', selectedId);

            const valasz = await meghiv('/api/editVaros', 'PUT', formData);
            console.log(valasz);

            // form ürítése
            vnevInput.value = '';
            jarasInput.value = '';
            kistersegInput.value = '';
            nepessegInput.value = '';
            teruletInput.value = '';
            delete form.dataset.selectedid;
        });

        let deleteVarosBtn = document.getElementById('deleteVarosBtn');

        deleteVarosBtn.addEventListener('click', async () => {
            let form = document.getElementById('varosForm');
            const selectedId = form.dataset.selectedid; //kiválasztott sor id-ja

            if (!selectedId) {
                alert('Nincs kiválasztott város törlésre.');
                return;
            }

            const valasz = await Fetch(`/api/deleteVaros/${selectedId}`, 'DELETE');
            console.log(valasz);

            let vnevInput = document.getElementById('vnev');
            let jarasInput = document.getElementById('jaras');
            let kistersegInput = document.getElementById('kisterseg');
            let nepessegInput = document.getElementById('nepesseg');
            let teruletInput = document.getElementById('terulet');

            //legvégén minden input clear
            vnevInput.value = '';
            jarasInput.value = '';
            kistersegInput.value = '';
            nepessegInput.value = '';
            teruletInput = '';
            delete form.dataset.selectedid;
        });
    } catch (error) {
        console.error('Hiba: ' + error.message);
    }
});

const selectTr = () => {
    const tbody = document.querySelector('#varosBody');
    for (const tr of tbody.children) {
        tr.addEventListener('click', function () {
            const item = this;
            if (item.dataset.selected === 'true') {
                item.dataset.selected = 'false';
                item.classList.remove('table-active');
            } else {
                for (const tr of tbody.children) {
                    tr.dataset.selected = 'false';
                    tr.classList.remove('table-active');
                }
                item.dataset.selected = 'true';
                tr.classList.add('table-active');
            }
        });
    }
};

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

//!FORMDATA-s FETCH
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
            throw new Error('Hiba: ' + response.status + ' ' + response.statusText);
        }

        return response.json();
    } catch (error) {
        throw new Error('Hiba a küldéssel: ' + error.message);
    }
}
