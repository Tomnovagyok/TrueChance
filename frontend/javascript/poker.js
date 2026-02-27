document.addEventListener("DOMContentLoaded", function () {

  // ============================================================
  //!         FRONTEND – Csak megjelenítés és API hívások
  //! Semmilyen játéklogika, kártyaadat vagy kiértékelés nincs itt.
  //! Minden a szerverről jön a /api/poker/* végpontokon keresztül.
  // ============================================================

  // DOM elemek
  var checkBtn = document.getElementById("checkBtn");
  var callBtn = document.getElementById("callBtn");
  var raiseBtn = document.getElementById("raiseBtn");
  var foldBtn = document.getElementById("foldBtn");
  var resetBtn = document.getElementById("resetBtn");

  // Kártya kép / hátlap
  function kartyakep(lap) {
    return '<img src="../images/Kártyák/' + lap.szimbolum + '/' + lap.szam + '.png" class="kartya">';
  }
  function hatlap() {
    return '<img src="../images/Kártyák/Backside.png" class="kartya">';
  }

  // ==================== API HÍVÁS ====================
  function apiHivas(vegpont, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", vegpont, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function () {
      if (xhr.status === 200) {
        var adat = JSON.parse(xhr.responseText);
        callback(adat);
      } else {
        console.error("API hiba:", xhr.status, xhr.responseText);
      }
    };
    xhr.send();
  }

  // ==================== MEGJELENÍTÉS ====================
  function megjelenit(adat) {
    // Zseton kijelző
    document.getElementById("jatekos_zseton").innerHTML = adat.jatekosZseton;
    document.getElementById("ellenfel_zseton").innerHTML = adat.ellenfelZseton;
    document.getElementById("pot").innerHTML = adat.pot;

    // Ellenfél lapjai
    var ellenfelDiv = document.getElementById("ellenfel");
    ellenfelDiv.innerHTML = "";
    if (adat.ellenfelLapok) {
      for (var i = 0; i < adat.ellenfelLapok.length; i++) {
        ellenfelDiv.innerHTML += kartyakep(adat.ellenfelLapok[i]);
      }
    } else {
      ellenfelDiv.innerHTML = hatlap() + hatlap();
    }

    // Asztal lapjai
    var osztoDiv = document.getElementById("oszto");
    osztoDiv.innerHTML = "";
    for (var j = 0; j < 5; j++) {
      if (j < adat.asztalLapok.length) {
        osztoDiv.innerHTML += kartyakep(adat.asztalLapok[j]);
      } else {
        osztoDiv.innerHTML += hatlap();
      }
    }

    // Játékos lapjai
    var kezDiv = document.getElementById("kez");
    kezDiv.innerHTML = "";
    for (var i = 0; i < adat.kez.length; i++) {
      kezDiv.innerHTML += kartyakep(adat.kez[i]);
    }

    // Pontszámok
    document.getElementById("pontjaid").innerHTML = "Te: " + adat.jatekosKez;
    document.getElementById("ellenfel_pont").innerHTML = adat.ellenfelKez ? "Ellenfél: " + adat.ellenfelKez : "";

    // Eredmény / üzenet
    var eredmenyDiv = document.getElementById("eredmeny");
    eredmenyDiv.innerHTML = adat.uzenet || "";
    eredmenyDiv.className = adat.uzenetTipus || "";

    // Nyertes kiemelés
    if (adat.jatekVege && adat.uzenetTipus === "nyert") {
      highlightKez("kez");
    } else if (adat.jatekVege && adat.uzenetTipus === "vesztett") {
      highlightKez("ellenfel");
    }

    // Gombok kezelése
    gombokFrissit(adat);
  }

  // ==================== GOMBOK KEZELÉSE ====================
  function gombokKi() {
    checkBtn.disabled = true;
    callBtn.disabled = true;
    raiseBtn.disabled = true;
    foldBtn.disabled = true;
  }

  function gombokFrissit(adat) {
    if (adat.jatekVege || !adat.varakozikDontesre) {
      gombokKi();
      return;
    }
    foldBtn.disabled = false;
    if (adat.aktualisTet === 0) {
      checkBtn.disabled = false;
      callBtn.disabled = true;
      raiseBtn.disabled = false;
    } else {
      checkBtn.disabled = true;
      callBtn.disabled = false;
      raiseBtn.disabled = false;
    }
  }

  // ==================== HIGHLIGHT ====================
  function highlightKez(divId) {
    var lapok = document.getElementById(divId).querySelectorAll(".kartya");
    for (var i = 0; i < lapok.length; i++) lapok[i].classList.add("nyertes");
  }

  // ==================== GOMB ESEMÉNYEK ====================
  checkBtn.addEventListener("click", function () {
    gombokKi();
    apiHivas("/api/poker/check", megjelenit);
  });

  callBtn.addEventListener("click", function () {
    gombokKi();
    apiHivas("/api/poker/call", megjelenit);
  });

  raiseBtn.addEventListener("click", function () {
    gombokKi();
    apiHivas("/api/poker/raise", megjelenit);
  });

  foldBtn.addEventListener("click", function () {
    gombokKi();
    apiHivas("/api/poker/fold", megjelenit);
  });

  resetBtn.addEventListener("click", function () {
    apiHivas("/api/poker/uj", megjelenit);
  });

  // ==================== JÁTÉK INDÍTÁSA ====================
  gombokKi();
  apiHivas("/api/poker/uj", megjelenit);

});