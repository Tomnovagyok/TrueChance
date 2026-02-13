document.addEventListener("DOMContentLoaded", function () {

  // Változók deklarálása
  var kezpar = false; 
  var szamok = ["2", "3", "4", "5", "6", "7",];
  var szimbolumok = ["Pikk", "Treff", "Káró", "Kör"];
  var ertekek = [2,3,4,5,6,7,8,9,10,11,12,13,14];

  var osszlap = []; // teljes pakli
  var kez = []; // játékos lapjai
  var oszto = []; // asztal lapjai
  let sorlapok = []; // sor vizsgálathoz
  let flosslapok = []; // flöss vizsgálathoz
  let jatszolapok = []; // ideiglenes tároló
  let vanefloss = false; 
  let vanesor = false;

  // Segéd változók a kéz értékeléshez
  var kez_1_db = 1; 
  var kez_2_db = 1;
  var kez_1_szimb = 0; 
  var kez_2_szimb = 0;
  var Felforditott_db = 0;

  var legerosebbKez = { ertek: 0, nev: "Magas lap" };

  // Legerősebb kéz frissítése
  function ertekeles(szint, nev) {
    if (szint > legerosebbKez.ertek) {
      legerosebbKez.ertek = szint;
      legerosebbKez.nev = nev;
    }
  }

  // Kártya kép / hátlap
  function kartyakep(lap) { return `<img src="Kártyák/${lap.szimbolum}/${lap.szam}.png" class="kartya">`; }
  function hatlap() { return '<img src="Kártyák/Backside.png" class="kartya">'; }

  // Pakli létrehozása és keverése
  function Pakliletrehozas() {
    osszlap = [];
    for (var i = 0; i < szimbolumok.length; i++) {
      for (var j = 0; j < szamok.length; j++) {
        osszlap.push({ szimbolum: szimbolumok[i], szam: szamok[j], ertek: ertekek[j] });
      }
    }
    // Fisher-Yates keverés
    for (var k = osszlap.length - 1; k > 0; k--) {
      var rand = Math.floor(Math.random() * (k + 1));
      var temp = osszlap[k]; 
      osszlap[k] = osszlap[rand]; 
      osszlap[rand] = temp;
    }
  }

  // Új leosztás
  function reset() {
    kez = []; oszto = []; jatszolapok = []; sorlapok = []; flosslapok = [];
    kez_1_db = 1; kez_2_db = 1; kez_1_szimb = 0; kez_2_szimb = 0;
    Felforditott_db = 0;
    legerosebbKez.ertek = 0; legerosebbKez.nev = "Magas lap";

    Pakliletrehozas();

    // Kéz kiosztása
    kez.push(osszlap.pop());
    kez.push(osszlap.pop());

    // Asztal lapjai
    for (var i = 0; i < 5; i++) oszto.push(osszlap.pop());

    megjelenit();
  }

  // Megjelenítés a képernyőn
  function megjelenit() {
    var kezDiv = document.getElementById("kez");
    kezDiv.innerHTML = "";
    for (var i = 0; i < kez.length; i++) kezDiv.innerHTML += kartyakep(kez[i]);

    var osztoDiv = document.getElementById("oszto");
    osztoDiv.innerHTML = "";
    for (var j = 0; j < 5; j++) {
      if (j < Felforditott_db && oszto[j]) osztoDiv.innerHTML += kartyakep(oszto[j]);
      else osztoDiv.innerHTML += hatlap();
    }
    kiert();
  }

  // Kéz értékelés (párok, drill, póker, sor, flöss)
  function kiert() {
    vanefloss = false; vanesor = false;
    sorlapok = []; flosslapok = [];
    kez_1_db = 1; kez_2_db = 1; kez_1_szimb = 0; kez_2_szimb = 0;
    legerosebbKez.ertek = 0; legerosebbKez.nev = "Magas lap";

    // Kézpár ellenőrzése
    kezpar = kez[0].szam === kez[1].szam;
    if(kezpar){ kez_1_db++; kez_2_db++; ertekeles(2, "Kézpár"); } 

    // Párok és színek számolása
    for (var i = 0; i < Felforditott_db; i++) {
      if (kez[0].szam === oszto[i].szam) kez_1_db++;
      if (kez[1].szam === oszto[i].szam) kez_2_db++;
      if (kez[0].szimbolum === oszto[i].szimbolum) kez_1_szimb++;
      if (kez[1].szimbolum === oszto[i].szimbolum) kez_2_szimb++;
    }

    // Párok / drill / póker
    if (kez_1_db === 4 || kez_2_db === 4) ertekeles(8, "Póker");
    else if (kez_1_db === 3 || kez_2_db === 3) ertekeles(4, "Drill");
    else if (kez_1_db === 2 || kez_2_db === 2) {
      if (kez_1_db === 2 && kez_2_db === 2 && !kezpar) ertekeles(3, "Két Pár");
      else ertekeles(2, "Pár");
    }

    // Full house ellenőrzés
    if((kez_1_db === 3 && kez_2_db >= 2 || kez_2_db === 3 && kez_1_db >= 2 || kez_1_db === 3 && kez_2_db === 3) && !kezpar){
      ertekeles(7, "Full House"); 
    }

    // Sor ellenőrzés (egyszerű)
    var ertekLista = [kez[0].ertek, kez[1].ertek];
    for (var j = 0; j < Felforditott_db; j++){
      ertekLista.push(oszto[j].ertek);
      sorlapok.push(oszto[j]);
    } 
    if (ertekLista.includes(14)) ertekLista.push(1); // ász lehet 1 is
    ertekLista.sort((a, b) => a - b);

    var sorDb = 0;
    for (var k = 0; k < ertekLista.length - 1; k++) {
      if (ertekLista[k] + 1 === ertekLista[k + 1]) sorDb++;
      else if (ertekLista[k] !== ertekLista[k + 1]) sorDb = 0;
    }
    if (sorDb >= 4){ vanesor = true; ertekeles(5, "Sor"); }

    // Flöss ellenőrzés (színek számolása)
    let szimbolum_db_1 = 1; 
    let szimbolum_db_2 = 1;
    if(kez[0].szimbolum != kez[1].szimbolum){
      oszto.forEach((lap, i) => {
        if(i < Felforditott_db){
          if(lap.szimbolum == kez[0].szimbolum) szimbolum_db_1++;
          else if(lap.szimbolum == kez[1].szimbolum) szimbolum_db_2++;
        }
      });
    } else {
      szimbolum_db_1 = 2;
      oszto.forEach((lap, i) => { if(i < Felforditott_db && lap.szimbolum == kez[0].szimbolum) szimbolum_db_1++; });
    }

    if (szimbolum_db_1 >= 5 || szimbolum_db_2 >= 5){
      let floss_szimbolum = szimbolum_db_1 >= 5 ? kez[0].szimbolum : kez[1].szimbolum;
      oszto.forEach(lap => { if(lap.szimbolum == floss_szimbolum) flosslapok.push(lap); });
      vanefloss = true;
      ertekeles(6, "Flöss");
    }

    // Legerősebb kéz kiírása
    document.getElementById("pontjaid").innerHTML = "Pontjaid: " + legerosebbKez.nev;
  }

  // Következő lap felfordítása
  function nextLap() { if (Felforditott_db < 5) { Felforditott_db++; megjelenit(); } }

  // Gomb események
  document.getElementById("nextBtn").addEventListener("click", nextLap);
  document.getElementById("resetBtn").addEventListener("click", reset);

  // Játék indítása
  reset();

}); 