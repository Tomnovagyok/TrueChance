document.addEventListener("DOMContentLoaded", function () {

  var kezpar = false;

  var szamok = ["2", "3", "4", "5", "6"];
  var szimbolumok = ["Pikk", "Treff", "Káró", "Kör"];
  var ertekek = [2,3,4,5,6,7,8,9,10,11,12,13,14];

  var osszlap = [];
  var kez = [];
  var oszto = [];
  let sorlapok = [];
  let flosslapok = [];
  let jatszolapok = [];
  let vanefloss = false;
  let vanesor = false;

  var kez_1_db = 1;
  var kez_2_db = 1;
  var kez_1_szimb = 0;
  var kez_2_szimb = 0;

  var Felforditott_db = 0;

  var legerosebbKez = {
    ertek: 0,
    nev: "Magas lap"
  };

  // Értékelés
  function ertekeles(szint, nev) {
    if (szint > legerosebbKez.ertek) {
      legerosebbKez.ertek = szint;
      legerosebbKez.nev = nev;
    }
  }

  // Kártya megjelenítés
  function kartyakep(lap) {
    return `<img src="Kártyák/${lap.szimbolum}/${lap.szam}.png" class="kartya">`;
  }

  function hatlap() {
    return '<img src="Kártyák/Backside.png" class="kartya">';
  }

  // Pakli létrehozása és keverése
  function Pakliletrehozas() {
    osszlap = [];
    for (var i = 0; i < szimbolumok.length; i++) {
      for (var j = 0; j < szamok.length; j++) {
        osszlap.push({
          szimbolum: szimbolumok[i],
          szam: szamok[j],
          ertek: ertekek[j]
        });
      }
    }
    // Összekeverés
    for (var k = osszlap.length - 1; k > 0; k--) {
      var rand = Math.floor(Math.random() * (k + 1));
      var temp = osszlap[k];
      osszlap[k] = osszlap[rand];
      osszlap[rand] = temp;
    }
  }

  // Új leosztás
  function reset() {
    kez = [];
    oszto = [];
    jatszolapok = [];
    sorlapok = [];
    flosslapok = [];

    kez_1_db = 1;
    kez_2_db = 1;
    kez_1_szimb = 0;
    kez_2_szimb = 0;

    Felforditott_db = 0;

    legerosebbKez.ertek = 0;
    legerosebbKez.nev = "Magas lap";

    // Teljes pakli létrehozása minden resetnél
    Pakliletrehozas();

    // Kéz kiosztása
    kez.push(osszlap.pop());
    kez.push(osszlap.pop());

    // Asztal kiosztása (5 lap)
    for (var i = 0; i < 5; i++) {
      oszto.push(osszlap.pop());
    }

    megjelenit();
  }

  // Megjelenítés
  function megjelenit() {
    var kezDiv = document.getElementById("kez");
    kezDiv.innerHTML = "";
    for (var i = 0; i < kez.length; i++) {
      kezDiv.innerHTML += kartyakep(kez[i]);
    }

    var osztoDiv = document.getElementById("oszto");
    osztoDiv.innerHTML = "";
    for (var j = 0; j < 5; j++) {
      if (j < Felforditott_db && oszto[j]) {
        osztoDiv.innerHTML += kartyakep(oszto[j]);
      } else {
        osztoDiv.innerHTML += hatlap();
      }
    }
    kiert();
  }

  // Kiértékelés (egyszerűbb)
  function kiert() {
    vanefloss = false;
    vanesor = false;
    sorlapok = [];
    flosslapok = [];
    kez_1_db = 1;
    kez_2_db = 1;
    kez_1_szimb = 0;
    kez_2_szimb = 0;

    legerosebbKez.ertek = 0;
    legerosebbKez.nev = "Magas lap";

    kezpar = kez[0].szam === kez[1].szam;

    if(kezpar){
      kez_1_db++;
      kez_2_db++;
      ertekeles(2, "Kézpár");
    } 

    // Párok és szín számolás
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

    //Full house
    if((kez_1_db === 3 && kez_2_db >= 2 || kez_2_db === 3 && kez_1_db >= 2) && !kezpar){
      ertekeles(7, "Full House"); 
    }

    // Sor
    var ertekLista = [kez[0].ertek, kez[1].ertek];
    for (var j = 0; j < Felforditott_db; j++){
      ertekLista.push(oszto[j].ertek);
      sorlapok.push(oszto[j]);
    } 
    if (ertekLista.indexOf(14) !== -1){
      ertekLista.push(1);
    } 
    ertekLista.sort((a, b) => a - b);

    var sorDb = 0;
    for (var k = 0; k < ertekLista.length - 1; k++) {
      if (ertekLista[k] + 1 === ertekLista[k + 1]) sorDb++;
      else if (ertekLista[k] !== ertekLista[k + 1]) sorDb = 0;
    }
    if (sorDb >= 4){
      vanesor = true;
      ertekeles(5, "Sor");
    }

    // Flöss
    let szimbolum_db_1 = 1;
    let szimbolum_db_2 = 1;
    if(kez[0].szimbolum != kez[1].szimbolum){
      oszto.forEach((osztottlap, i) => {
        if(i < Felforditott_db){
          if(osztottlap.szimbolum == kez[0].szimbolum){
            szimbolum_db_1++;
          }
          else if(osztottlap.szimbolum == kez[1].szimbolum){
            szimbolum_db_2++;
          }
        }
      });
    }
    else{
      szimbolum_db_1 = 2
      oszto.forEach((osztottlap, i) => {
        if(i < Felforditott_db){
          if(osztottlap.szimbolum == kez[0].szimbolum){
            szimbolum_db_1++;
          }
        }
      });
    }
    
    if (szimbolum_db_1 >= 5 || szimbolum_db_2 >= 5){
      let floss_szimbolum;
      if(szimbolum_db_1 >= 5){
        floss_szimbolum = kez[0].szimbolum
      }
      else{
        floss_szimbolum = kez[1].szimbolum
      }
      oszto.forEach(lap => {
        if(lap.szimbolum == floss_szimbolum){
          flosslapok.push(lap);
        }
      });
      vanefloss = true;
      ertekeles(6, "Flöss");
    }

    // Pont kiírásának
    document.getElementById("pontjaid").innerHTML = "Pontjaid: " + legerosebbKez.nev;

    // Színsor
    if (vanefloss && flosslapok.length > 0) {
      let flushErtekek = [];

      // Kéz lapok
      if (kez[0].szimbolum === flosslapok[0].szimbolum && !flushertekek.includes(kez[0].ertek)) {
        flushErtekek.push(kez[0].ertek);
      }
      if (kez[1].szimbolum === flosslapok[0].szimbolum && !flushertekek.includes(kez[1].ertek)) {
        flushErtekek.push(kez[1].ertek);
      }

      // Asztal lapok
      oszto.forEach((lap, i) => {
        if (i < Felforditott_db && lap.szimbolum === flosslapok[0].szimbolum) {
          if (!flushErtekek.includes(lap.ertek)) {
            flushErtekek.push(lap.ertek);
          }
        }
      });

      if (flushErtekek.includes(14)) {
        flushErtekek.push(1);
      }

      flushErtekek.sort((a, b) => a - b); //Sort (Ha a-b > 0 => a b elé kerül, fordított esetben marad a helyzete)

      // Sor ellenőrzés csak flöss színen belül
      let sorDb = 0;

      for (let i = 0; i < flushErtekek.length - 1; i++) {
        if (flushErtekek[i] + 1 === flushErtekek[i + 1]) {
          sorDb++;
          if (sorDb >= 4) {
            if (
              flushErtekek.includes(10) &&
              flushErtekek.includes(11) &&
              flushErtekek.includes(12) &&
              flushErtekek.includes(13) &&
              flushErtekek.includes(14)
            ) {
              ertekeles(10, "Royal flöss");
            } else {
              ertekeles(9, "Színsor");
            }
            break; // <-- FONTOS
          }
        } 
        else if (flushErtekek[i] !== flushErtekek[i + 1]) {
          sorDb = 0;
        }
      }
    }
  }

  // Next lap
  function nextLap() {
    if (Felforditott_db < 5) {
      Felforditott_db++;
      megjelenit();
    }
  }

  // Események
  document.getElementById("nextBtn").addEventListener("click", nextLap);
  document.getElementById("resetBtn").addEventListener("click", reset);

  // Start
  reset();

});
