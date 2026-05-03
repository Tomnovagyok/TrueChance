// Főoldal (index) kliens oldali szkriptje.
// Csak a demó statisztika számlálót (szimuláció) és a horgony (anchor) linkeket kezeli.
document.addEventListener('DOMContentLoaded', function () {
    var szimulacioIdozito = null;

    beallitStatisztikaKapcsolo();
    beallitSimaGorgetest();

    function beallitStatisztikaKapcsolo() {
        var kapcsoloElem = document.getElementById('statsToggle');
        var tartalomElem = document.getElementById('statsContent');

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
        var nyeresiEselyElem = document.getElementById('stat-win-chance');
        var atlagosVesztesegElem = document.getElementById('stat-avg-loss');
        var hazElonyElem = document.getElementById('stat-house-edge');

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

    // Egyszerű anchor linkek működnek böngészőben alapértelmezésből
    function beallitSimaGorgetest() {
        var osszecsukhato = document.getElementById('navbarNav');

        document.querySelectorAll('a[href^="#"]').forEach(function (link) {
            link.addEventListener('click', function () {
                if (osszecsukhato.classList.contains('show')) {
                    new bootstrap.Collapse(osszecsukhato).hide();
                }
            });
        });
    }
});
