document.addEventListener("DOMContentLoaded", function () {
  var nextBtn = document.getElementById("nextBtn");
  var doubleBtn = document.getElementById("doubleBtn");
  var splitBtn = document.getElementById("splitBtn");
  var standBtn = document.getElementById("standBtn");
  var resetBtn = document.getElementById("resetBtn");
  if (nextBtn) nextBtn.addEventListener("click", hit);
  if (doubleBtn) doubleBtn.addEventListener("click", double);
  if (splitBtn) splitBtn.addEventListener("click", split);
  if (standBtn) standBtn.addEventListener("click", stand);
  if (resetBtn) resetBtn.addEventListener("click", reset);
  // Kezdeti állapot
  reset();
  // Azonnal osszuk ki a lapokat, ha a deal függvény használható
  deal();
});

// Kártya adatok
var szamok = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
var szimbolumok = ["Pikk", "Treff", "Káró", "Kör"];
var ertekek = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];

var pakli = [];
var jatekosKez = []; // játékos lapjai
var osztoKez = []; // osztó lapjai
var osztoRejtett = true;
var jatekosKez2 = []; // második kéz (split esetén)
var kezIndex = 1; // melyik kézet játszuk (1 vagy 2)
var jatekosKez_Nyert = false; // első kéz nyert-e már
var jatekosKez2_Nyert = false; // második kéz nyert-e már

// Pakli létrehozása és keverése
function Pakliletrehozas() {
  pakli = [];
  for (var i = 0; i < szimbolumok.length; i++) {
    for (var j = 0; j < szamok.length; j++) {
      pakli.push({
        szimbolum: szimbolumok[i],
        szam: szamok[j],
        ertek: ertekek[j],
      });
    }
  }
  // Fisher-Yates
  for (var k = pakli.length - 1; k > 0; k--) {
    var rand = Math.floor(Math.random() * (k + 1));
    var temp = pakli[k];
    pakli[k] = pakli[rand];
    pakli[rand] = temp;
  }
}

function kartyakep(lap) {
  return `<img src="Kártyák/${lap.szimbolum}/${lap.szam}.png" class="kartya">`;
}
function hatlap() {
  return '<img src="Kártyák/Backside.png" class="kartya">';
}

// Ász érték kezelése: először 11-nek számoljuk, majd ha >21, csökkentünk 10-et amíg A van.
function kezErtek(kezek) {
  var osszeg = 0;
  var aszDb = 0;
  for (var i = 0; i < kezek.length; i++) {
    var v = kezek[i].ertek;
    osszeg += v;
    if (kezek[i].szam === "A") aszDb++;
  }
  while (osszeg > 21 && aszDb > 0) {
    osszeg -= 10;
    aszDb--;
  }
  return osszeg;
}

// Megjelenítés
function megjelenit() {
  var kezDiv = document.getElementById("kez");
  if (kezDiv) {
    kezDiv.innerHTML = "";

    // Első kéz div
    var kez1Div = document.createElement("div");
    kez1Div.className = "jatekos-kez";
    if (kezIndex === 1 && jatekosKez2.length > 0) {
      kez1Div.className += " aktiv";
    }
    for (var i = 0; i < jatekosKez.length; i++) {
      kez1Div.innerHTML += kartyakep(jatekosKez[i]);
    }
    kezDiv.appendChild(kez1Div);

    // Szeparátor ha split van
    if (jatekosKez2.length > 0) {
      var szeparator = document.createElement("span");
      szeparator.innerHTML = " | ";
      kezDiv.appendChild(szeparator);

      // Második kéz div
      var kez2Div = document.createElement("div");
      kez2Div.className = "jatekos-kez";
      if (kezIndex === 2) {
        kez2Div.className += " aktiv";
      }
      for (var i = 0; i < jatekosKez2.length; i++) {
        kez2Div.innerHTML += kartyakep(jatekosKez2[i]);
      }
      kezDiv.appendChild(kez2Div);
    }
  }

  // Megmutatjuk melyik kezet játsszuk
  var jelenlegiKezEl = document.getElementById("jelenlegi_kez");
  if (jelenlegiKezEl) {
    if (jatekosKez2.length > 0) {
      jelenlegiKezEl.innerHTML =
        "Jelenlegi kéz: " + (kezIndex === 1 ? "Első" : "Második");
    } else {
      jelenlegiKezEl.innerHTML = "";
    }
  }

  var jatekosOsszegEl = document.getElementById("jatekos_osszeg");
  if (jatekosOsszegEl) {
    var ertek1 = jatekosKez.length ? kezErtek(jatekosKez) : "-";
    var ertek2 = jatekosKez2.length ? kezErtek(jatekosKez2) : "";
    var szoveg = "Játékos pont: " + ertek1;
    if (jatekosKez2.length > 0) szoveg += " | " + ertek2;
    jatekosOsszegEl.innerHTML = szoveg;
  }

  var osztoDiv = document.getElementById("oszto");
  if (osztoDiv) {
    osztoDiv.innerHTML = "";
    if (osztoKez.length > 0) {
      osztoDiv.innerHTML += kartyakep(osztoKez[0]);
      if (osztoKez.length > 1) {
        if (osztoRejtett) osztoDiv.innerHTML += hatlap();
        else osztoDiv.innerHTML += kartyakep(osztoKez[1]);
      }
      for (var j = 2; j < osztoKez.length; j++) {
        osztoDiv.innerHTML += kartyakep(osztoKez[j]);
      }
    }
  }
  var osztoOsszegEl = document.getElementById("oszto_osszeg");
  if (osztoOsszegEl)
    osztoOsszegEl.innerHTML =
      "Oszto pont: " +
      (osztoRejtett ? "?" : osztoKez.length ? kezErtek(osztoKez) : "-");
}

function deal() {
  Pakliletrehozas();
  jatekosKez = [];
  osztoKez = [];
  jatekosKez2 = [];
  kezIndex = 1;
  osztoRejtett = true;
  jatekosKez_Nyert = false;
  jatekosKez2_Nyert = false;

  // Kiosztás: játékos 2 lap, osztó 2 lap (egy rejtve)
  jatekosKez.push(pakli.pop());
  osztoKez.push(pakli.pop());
  jatekosKez.push(pakli.pop());
  osztoKez.push(pakli.pop());

  // Gombok állítása
  var nextBtn = document.getElementById("nextBtn");
  if (nextBtn) nextBtn.disabled = false;
  var doubleBtn = document.getElementById("doubleBtn");
  if (doubleBtn) doubleBtn.disabled = false;
  var splitBtn = document.getElementById("splitBtn");
  // Split gomb csak akkor engedélyezett, ha a két lap egyforma
  if (splitBtn) {
    if (jatekosKez[0].szam === jatekosKez[1].szam) {
      splitBtn.disabled = false;
    } else {
      splitBtn.disabled = true;
    }
  }
  var standBtn = document.getElementById("standBtn");
  if (standBtn) standBtn.disabled = false;
  var resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.disabled = false;
  var statusEl = document.getElementById("pontjaid");
  if (statusEl) statusEl.innerHTML = "Állapot: osztva";

  megjelenit();

  // Azonnali blackjack ellenőrzés
  if (kezErtek(jatekosKez) === 21) {
    stand();
  }
}

function hit() {
  if (pakli.length === 0) return;

  // Eldöntjük melyik kezet játszuk
  var aktualKez = kezIndex === 1 ? jatekosKez : jatekosKez2;

  aktualKez.push(pakli.pop());
  megjelenit();

  // Split gomb mindig disabled, ha nem az első kéz 2 lapja a helyzet
  var splitBtn = document.getElementById("splitBtn");
  if (splitBtn) {
    splitBtn.disabled = true;
  }

  var ertek = kezErtek(aktualKez);

  // Ellenőrzés blackjack-re (21)
  if (ertek === 21 && jatekosKez2.length > 0) {
    // Split van és ez 21
    if (kezIndex === 1) {
      jatekosKez_Nyert = true;
      var statusEl = document.getElementById("pontjaid");
      if (statusEl) statusEl.innerHTML = "Állapot: Első kéz 21 - Második kéz";
      kezIndex = 2;
      megjelenit();
      // Engedélyezzük a játékot a második keznél
      var nextBtn = document.getElementById("nextBtn");
      if (nextBtn) nextBtn.disabled = false;
      var doubleBtn = document.getElementById("doubleBtn");
      if (doubleBtn) doubleBtn.disabled = false;
      var splitBtn = document.getElementById("splitBtn");
      if (splitBtn) splitBtn.disabled = true;
    } else {
      jatekosKez2_Nyert = true;
      // Mindkét kéz játékban van
      stand();
    }
    return;
  }

  if (ertek > 21) {
    // Bust az aktuális keznél
    var statusEl = document.getElementById("pontjaid");
    if (statusEl) statusEl.innerHTML = "Állapot: Bust az aktuális keznél";

    // Ha split van és az első kézzel játszunk, váltunk a másodikra
    if (jatekosKez2.length > 0 && kezIndex === 1) {
      kezIndex = 2;
      megjelenit();
      var statusEl2 = document.getElementById("pontjaid");
      if (statusEl2) statusEl2.innerHTML = "Állapot: Split - Második kéz";
      // Engedélyezzük a játékot a második keznél
      var nextBtn = document.getElementById("nextBtn");
      if (nextBtn) nextBtn.disabled = false;
      var doubleBtn = document.getElementById("doubleBtn");
      if (doubleBtn) doubleBtn.disabled = false;
      var splitBtn = document.getElementById("splitBtn");
      if (splitBtn) splitBtn.disabled = true;
    } else {
      // Nincs második kéz vagy már ott vagyunk, letiltjuk a gombokat
      var nextBtn = document.getElementById("nextBtn");
      if (nextBtn) nextBtn.disabled = true;
      var doubleBtn = document.getElementById("doubleBtn");
      if (doubleBtn) doubleBtn.disabled = true;
      var splitBtn = document.getElementById("splitBtn");
      if (splitBtn) splitBtn.disabled = true;
      var standBtn = document.getElementById("standBtn");
      if (standBtn) standBtn.disabled = true;
    }
  }
}

function double() {
  if (pakli.length === 0) return;

  // Csak akkor lehet double, ha még csak 2 lapunk van
  var aktualKez = kezIndex === 1 ? jatekosKez : jatekosKez2;
  if (aktualKez.length !== 2) return;

  // Egy lapot kérünk
  aktualKez.push(pakli.pop());
  megjelenit();

  // Split gomb le kell tiltva legyen, mivel már több mint 2 lapunk van
  var splitBtn = document.getElementById("splitBtn");
  if (splitBtn) {
    splitBtn.disabled = true;
  }

  var ertek = kezErtek(aktualKez);

  // Ellenőrzés blackjack-re (21)
  if (ertek === 21 && jatekosKez2.length > 0) {
    // Split van és ez 21
    if (kezIndex === 1) {
      jatekosKez_Nyert = true;
      var statusEl = document.getElementById("pontjaid");
      if (statusEl) statusEl.innerHTML = "Állapot: Első kéz 21 - Második kéz";
      kezIndex = 2;
      megjelenit();
      // Engedélyezzük az új kéz játékát
      var nextBtn = document.getElementById("nextBtn");
      if (nextBtn) nextBtn.disabled = false;
      var doubleBtn = document.getElementById("doubleBtn");
      if (doubleBtn) doubleBtn.disabled = false;
      var splitBtn = document.getElementById("splitBtn");
      if (splitBtn) splitBtn.disabled = true;
    } else {
      jatekosKez2_Nyert = true;
      // Mindkét kéz játékban van
      stand();
    }
    return;
  }

  // Double után automatikusan megállunk az aktuális keznél
  if (jatekosKez2.length > 0) {
    // Ha split volt, akkor a másik kezzel játszunk tovább
    if (kezIndex === 1) {
      kezIndex = 2;
      megjelenit();

      if (ertek > 21) {
        var statusEl = document.getElementById("pontjaid");
        if (statusEl)
          statusEl.innerHTML = "Állapot: Bust az első keznél - Második kéz";
      } else {
        var statusEl = document.getElementById("pontjaid");
        if (statusEl) statusEl.innerHTML = "Állapot: Split - Második kéz";
      }

      // Engedélyezzük az új kéz játékát
      var nextBtn = document.getElementById("nextBtn");
      if (nextBtn) nextBtn.disabled = false;
      var doubleBtn = document.getElementById("doubleBtn");
      if (doubleBtn) doubleBtn.disabled = false;
      var splitBtn = document.getElementById("splitBtn");
      if (splitBtn) splitBtn.disabled = true;
    } else {
      // Mindkét kézzel végez, így a Stand függvényt hívjuk
      stand();
    }
  } else {
    // Nincs split, így a Stand függvényt hívjuk
    stand();
  }
}

function split() {
  // Csak akkor lehet split, ha pont 2 lapunk van és egyforma értékűek
  if (jatekosKez.length !== 2) return;

  var ertek1 = jatekosKez[0].ertek;
  var ertek2 = jatekosKez[1].ertek;

  // Az ásznak és a 10-es értékű lapoknak külön kezelés
  if (
    (jatekosKez[0].szam === "A" && jatekosKez[1].szam === "A") ||
    jatekosKez[0].szam === jatekosKez[1].szam
  ) {
    // Lehet splittelni
    // Az első lapot az első kezre hagyjuk, a másodikat a második kezre tesszük
    jatekosKez2.push(jatekosKez[1]);
    jatekosKez.pop();

    // Mindkét keznek kérünk egy lapot
    jatekosKez.push(pakli.pop());
    jatekosKez2.push(pakli.pop());

    kezIndex = 1;
    megjelenit();

    var statusEl = document.getElementById("pontjaid");
    if (statusEl) statusEl.innerHTML = "Állapot: Split - Első kéz";

    // Disable split, csak az első keznél lehet
    var splitBtn = document.getElementById("splitBtn");
    if (splitBtn) splitBtn.disabled = true;
  }
}

function stand() {
  // Ha split van és még nem játszottunk a második kezzel
  if (jatekosKez2.length > 0 && kezIndex === 1) {
    kezIndex = 2;
    var statusEl = document.getElementById("pontjaid");
    if (statusEl) statusEl.innerHTML = "Állapot: Split - Második kéz";
    megjelenit();
    // Engedélyezzük a játékot a második keznél
    var nextBtn = document.getElementById("nextBtn");
    if (nextBtn) nextBtn.disabled = false;
    var doubleBtn = document.getElementById("doubleBtn");
    if (doubleBtn) doubleBtn.disabled = false;
    var splitBtn = document.getElementById("splitBtn");
    if (splitBtn) splitBtn.disabled = true;
    return;
  }

  // Ezen a ponton mindkét kézzel végezünk, most az osztó jön
  // Osztó felfedi a második lapját
  osztoRejtett = false;

  // Megjelenítsük az osztó lapját
  var osztoDiv = document.getElementById("oszto");
  if (osztoDiv) {
    osztoDiv.innerHTML = "";
    if (osztoKez.length > 0) {
      osztoDiv.innerHTML += kartyakep(osztoKez[0]);
      for (var j = 1; j < osztoKez.length; j++) {
        osztoDiv.innerHTML += kartyakep(osztoKez[j]);
      }
    }
  }

  // Osztó húz 17-ig
  while (kezErtek(osztoKez) < 17) {
    osztoKez.push(pakli.pop());
    // Megjelenítsük minden húzás után
    if (osztoDiv) {
      osztoDiv.innerHTML = "";
      if (osztoKez.length > 0) {
        osztoDiv.innerHTML += kartyakep(osztoKez[0]);
        for (var j = 1; j < osztoKez.length; j++) {
          osztoDiv.innerHTML += kartyakep(osztoKez[j]);
        }
      }
    }
  }

  var jatekosPont = kezErtek(jatekosKez);
  var jatekosPont2 = jatekosKez2.length ? kezErtek(jatekosKez2) : 0;
  var osztoPont = kezErtek(osztoKez);

  var eredmeny = "";
  var eredmeny2 = "";

  // Első kéz eredménye
  if (jatekosKez_Nyert) {
    eredmeny = "Nyertél (21)";
  } else if (jatekosPont > 21) eredmeny = "Vesztettél";
  else if (osztoPont > 21) eredmeny = "Nyertél";
  else if (jatekosPont > osztoPont) eredmeny = "Nyertél";
  else if (jatekosPont < osztoPont) eredmeny = "Vesztettél";
  else eredmeny = "Döntetlen";

  // Második kéz eredménye (ha van split)
  if (jatekosKez2.length > 0) {
    if (jatekosKez2_Nyert) {
      eredmeny2 = " | Nyertél (21)";
    } else if (jatekosPont2 > 21) eredmeny2 = " | Vesztettél";
    else if (osztoPont > 21) eredmeny2 = " | Nyertél";
    else if (jatekosPont2 > osztoPont) eredmeny2 = " | Nyertél";
    else if (jatekosPont2 < osztoPont) eredmeny2 = " | Vesztettél";
    else eredmeny2 = " | Döntetlen";
  }

  var statusEl = document.getElementById("pontjaid");
  if (statusEl) statusEl.innerHTML = "Állapot: " + eredmeny + eredmeny2;

  // letiltjuk a gombokat a kör végén
  var nextBtn = document.getElementById("nextBtn");
  if (nextBtn) nextBtn.disabled = true;
  var doubleBtn = document.getElementById("doubleBtn");
  if (doubleBtn) doubleBtn.disabled = true;
  var splitBtn = document.getElementById("splitBtn");
  if (splitBtn) splitBtn.disabled = true;
  var standBtn = document.getElementById("standBtn");
  if (standBtn) standBtn.disabled = true;

  // Frissítjük a végső pontokat is
  var jatekosOsszegEl = document.getElementById("jatekos_osszeg");
  if (jatekosOsszegEl) {
    var szoveg = "Játékos pont: " + jatekosPont;
    if (jatekosKez2.length > 0) szoveg += " | " + jatekosPont2;
    jatekosOsszegEl.innerHTML = szoveg;
  }
  var osztoOsszegEl = document.getElementById("oszto_osszeg");
  if (osztoOsszegEl) osztoOsszegEl.innerHTML = "Oszto pont: " + osztoPont;
}

function reset() {
  // Alaphelyzet
  jatekosKez = [];
  osztoKez = [];
  jatekosKez2 = [];
  pakli = [];
  osztoRejtett = true;
  kezIndex = 1;
  jatekosKez_Nyert = false;
  jatekosKez2_Nyert = false;
  var nextBtn = document.getElementById("nextBtn");
  if (nextBtn) nextBtn.disabled = true;
  var doubleBtn = document.getElementById("doubleBtn");
  if (doubleBtn) doubleBtn.disabled = true;
  var splitBtn = document.getElementById("splitBtn");
  if (splitBtn) splitBtn.disabled = true;
  var standBtn = document.getElementById("standBtn");
  if (standBtn) standBtn.disabled = true;
  var resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.disabled = false;
  var statusEl = document.getElementById("pontjaid");
  if (statusEl) statusEl.innerHTML = "Állapot: várakozás";
  var kezEl = document.getElementById("kez");
  if (kezEl) kezEl.innerHTML = "";
  var osztoEl = document.getElementById("oszto");
  if (osztoEl) osztoEl.innerHTML = "";
  var jatekosOsszegEl = document.getElementById("jatekos_osszeg");
  if (jatekosOsszegEl) jatekosOsszegEl.innerHTML = "Játékos pont: -";
  var osztoOsszegEl = document.getElementById("oszto_osszeg");
  if (osztoOsszegEl) osztoOsszegEl.innerHTML = "Oszto pont: -";
  // Kiosztunk egy új leosztást a reset gomb megnyomásakor
  deal();
}
