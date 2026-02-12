document.addEventListener('DOMContentLoaded', function () {

  var szimulacioIdozito = null;

  beallitStatisztikaKapcsolo();
  beallitSimaGorgetest();

  //eza rész csak a statisztika kapcsoló működéséhez szükséges, a szimulációs adatok random generálása miatt van benne, hogy látszódjon a változás
  function beallitStatisztikaKapcsolo() {
    var kapcsoloElem = document.getElementById('statsToggle');
    var tartalomElem = document.getElementById('statsContent');

    kapcsoloElem.addEventListener('change', function () {
      if (this.checked) {
        tartalomElem.classList.add('active');
        statisztikaFrissites();
        szimulacioIdozito = setInterval(statisztikaFrissites, 2000); //2 mp-ként frissíti a statisztikai adatokat
      } else {
        tartalomElem.classList.remove('active');
        clearInterval(szimulacioIdozito);
        szimulacioIdozito = null;
      }
    });
  }

  // Ez a függvény szimulálja a statisztikai adatok frissítését, valós adatok helyett random értékeket generál
  function statisztikaFrissites() {
    var nyeresiEselyElem = document.getElementById('stat-win-chance');
    var atlagosVesztesegElem = document.getElementById('stat-avg-loss');
    var hazElonyElem = document.getElementById('stat-house-edge');

    if (nyeresiEselyElem) {
      nyeresiEselyElem.innerHTML = (Math.random() * 15 + 35).toFixed(1) + '%'; //toFixed - 1 tizedesjegyig kerekítés, így a százalékos értékek szebben jelennek meg
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
    var osszecsukhato = document.querySelector('.navbar-collapse');

    document.querySelectorAll('a[href^="#"]').forEach(function (link) { //csak azokat a linkeket veszi figyelembe, aminek a href attribútuma # karakterrel kezdődik, vagyis az oldal egy adott részére mutató linkeket. Ezáltal a sima görgetés csak az ilyen anchor linkekre lesz alkalmazva, és nem befolyásolja a többi link viselkedését.
      link.addEventListener('click', function () {
        if (osszecsukhato.classList.contains('show')) { // Ez a feltétel ellenőrzi, hogy a navigációs menü jelenleg nyitva van-e (mobilnézetben), és ha igen, akkor bezárja azt.
          new bootstrap.Collapse(osszecsukhato).hide(); //bootstrap.collapse - ez a sor felelős azért, hogy a mobilnézetben a navigációs menü automatikusan bezáródjon, amikor egy anchor linkre kattintanak. Ez javítja a felhasználói élményt, mivel nem kell manuálisan bezárni a menüt minden egyes kattintás után.
        }
      });
    });
  }

});
