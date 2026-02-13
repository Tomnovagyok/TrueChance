document.addEventListener("DOMContentLoaded", function () {
  var nextBtn = document.getElementById("nextBtn");
  var standBtn = document.getElementById("standBtn");
  var resetBtn = document.getElementById("resetBtn");
  if (nextBtn) nextBtn.addEventListener("click", hit);
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
var ertekek = [2,3,4,5,6,7,8,9,10,10,10,10,11];

var pakli = [];
var jatekosKez = []; // játékos lapjai
var osztoKez = []; // osztó lapjai
var osztoRejtett = true;

// Pakli létrehozása és keverése
function Pakliletrehozas() {
  pakli = [];
  for (var i = 0; i < szimbolumok.length; i++) {
    for (var j = 0; j < szamok.length; j++) {
      pakli.push({ szimbolum: szimbolumok[i], szam: szamok[j], ertek: ertekek[j] });
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
    if (kezek[i].szam === 'A') aszDb++;
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
    for (var i = 0; i < jatekosKez.length; i++) {
      kezDiv.innerHTML += kartyakep(jatekosKez[i]);
    }
  }
  var jatekosOsszegEl = document.getElementById("jatekos_osszeg");
  if (jatekosOsszegEl) jatekosOsszegEl.innerHTML = "Játékos pont: " + (jatekosKez.length ? kezErtek(jatekosKez) : "-");

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
  if (osztoOsszegEl) osztoOsszegEl.innerHTML = "Oszto pont: " + (osztoRejtett ? "?" : (osztoKez.length ? kezErtek(osztoKez) : "-"));
}

function deal() {
  Pakliletrehozas();
  jatekosKez = [];
  osztoKez = [];
  osztoRejtett = true;

  // Kiosztás: játékos 2 lap, osztó 2 lap (egy rejtve)
  jatekosKez.push(pakli.pop());
  osztoKez.push(pakli.pop());
  jatekosKez.push(pakli.pop());
  osztoKez.push(pakli.pop());

  // Gombok állítása
  var nextBtn = document.getElementById("nextBtn"); if (nextBtn) nextBtn.disabled = false;
  var standBtn = document.getElementById("standBtn"); if (standBtn) standBtn.disabled = false;
  var resetBtn = document.getElementById("resetBtn"); if (resetBtn) resetBtn.disabled = false;
  var statusEl = document.getElementById("pontjaid"); if (statusEl) statusEl.innerHTML = "Állapot: osztva";

  megjelenit();

  // Azonnali blackjack ellenőrzés
  if (kezErtek(jatekosKez) === 21) {
    stand();
  }
}

function hit() {
  if (pakli.length === 0) return;
  jatekosKez.push(pakli.pop());
  megjelenit();
  var ertek = kezErtek(jatekosKez);
  if (ertek > 21) {
    var statusEl = document.getElementById("pontjaid"); if (statusEl) statusEl.innerHTML = "Állapot: Bust — vesztettél";
    var nextBtn = document.getElementById("nextBtn"); if (nextBtn) nextBtn.disabled = true;
    var standBtn = document.getElementById("standBtn"); if (standBtn) standBtn.disabled = true;
  }
}

function stand() {
  // Osztó felfedi a második lapját és húz 17-ig
  osztoRejtett = false;
  megjelenit();
  while (kezErtek(osztoKez) < 17) {
    osztoKez.push(pakli.pop());
    megjelenit();
  }
  var jatekosPont = kezErtek(jatekosKez);
  var osztoPont = kezErtek(osztoKez);
  var eredmeny = "Döntetlen";
  if (jatekosPont > 21) eredmeny = "Vesztettél";
  else if (osztoPont > 21) eredmeny = "Nyertél";
  else if (jatekosPont > osztoPont) eredmeny = "Nyertél";
  else if (jatekosPont < osztoPont) eredmeny = "Vesztettél";
  var statusEl2 = document.getElementById("pontjaid"); if (statusEl2) statusEl2.innerHTML = "Állapot: " + eredmeny;
  // letiltjuk a gombokat a kör végén
  var nextBtn2 = document.getElementById("nextBtn"); if (nextBtn2) nextBtn2.disabled = true;
  var standBtn2 = document.getElementById("standBtn"); if (standBtn2) standBtn2.disabled = true;
  // Frissítjük a végső pontokat is
  var jatekosOsszegEl2 = document.getElementById("jatekos_osszeg"); if (jatekosOsszegEl2) jatekosOsszegEl2.innerHTML = "Játékos pont: " + jatekosPont;
  var osztoOsszegEl2 = document.getElementById("oszto_osszeg"); if (osztoOsszegEl2) osztoOsszegEl2.innerHTML = "Oszto pont: " + osztoPont;
}

function reset() {
  // Alaphelyzet
  jatekosKez = [];
  osztoKez = [];
  pakli = [];
  osztoRejtett = true;
  var nextBtn = document.getElementById("nextBtn"); if (nextBtn) nextBtn.disabled = true;
  var standBtn = document.getElementById("standBtn"); if (standBtn) standBtn.disabled = true;
  var resetBtn = document.getElementById("resetBtn"); if (resetBtn) resetBtn.disabled = false;
  var statusEl3 = document.getElementById("pontjaid"); if (statusEl3) statusEl3.innerHTML = "Állapot: várakozás";
  var kezEl = document.getElementById("kez"); if (kezEl) kezEl.innerHTML = "";
  var osztoEl = document.getElementById("oszto"); if (osztoEl) osztoEl.innerHTML = "";
  var jatekosOsszegEl3 = document.getElementById("jatekos_osszeg"); if (jatekosOsszegEl3) jatekosOsszegEl3.innerHTML = "Játékos pont: -";
  var osztoOsszegEl3 = document.getElementById("oszto_osszeg"); if (osztoOsszegEl3) osztoOsszegEl3.innerHTML = "Oszto pont: -";
  // Kiosztunk egy új leosztást a reset gomb megnyomásakor
  deal();
}
