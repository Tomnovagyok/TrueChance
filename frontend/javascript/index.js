document.addEventListener('DOMContentLoaded', function () {
    let szimulacioIdozito = null;

    beallitStatisztikaKapcsolo();
    beallitSimaGorgetest();

    function beallitStatisztikaKapcsolo() {
        const kapcsoloElem = document.getElementById('statsToggle');
        const tartalomElem = document.getElementById('statsContent');

        kapcsoloElem.addEventListener('change', function () {
            if (this.checked) {
                tartalomElem.classList.add('active');
                statisztikaFrissites();
                szimulacioIdozito = setInterval(statisztikaFrissites, 2000);
            } else {
                tartalomElem.classList.remove('active');
                clearInterval(szimulacioIdozito);
                szimulacioIdozito = null;
            }
        });
    }

    function statisztikaFrissites() {
        const nyeresiEselyElem = document.getElementById('stat-win-chance');
        const atlagosVesztesegElem = document.getElementById('stat-avg-loss');
        const hazElonyElem = document.getElementById('stat-house-edge');

        if (nyeresiEselyElem) {
            nyeresiEselyElem.innerHTML = (Math.random() * 15 + 35).toFixed(1) + '%';
        }

        if (atlagosVesztesegElem) {
            atlagosVesztesegElem.innerHTML = Math.round(Math.random() * 500 + 1000) + ' Ft';
        }

        if (hazElonyElem) {
            hazElonyElem.innerHTML = (Math.random() * 3 + 2).toFixed(2) + '%';
        }
    }

    function beallitSimaGorgetest() {
        const osszecsukhato = document.getElementById('navbarNav');

        document.querySelectorAll('a[href^="#"]').forEach(function (link) {
            link.addEventListener('click', function () {
                if (osszecsukhato.classList.contains('show')) {
                    new bootstrap.Collapse(osszecsukhato).hide();
                }
            });
        });
    }
});
