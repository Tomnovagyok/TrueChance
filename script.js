document.addEventListener("DOMContentLoaded", function () {
  let kezpar = false;

  let szamok = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ];
  let szimbolumok = ["Pikk", "Káró", "Treff", "Kör"];
  let ertekek = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  let osszlap = [];
  let kez = [];
  let oszto = [];
  let jatszolapok = [];

  let kez_1_db, kez_2_db;
  let kez_1_szimb, kez_2_szimb;

  let Felforditott_db = 0; // Mennyi asztali lap van felfordítva

  //=============================  Legerősebb kéz eltárolása  =============================
  let legerosebbKez = { ertek: 0, nev: "Magas lap" };
  function ertekeles(szint, nev) {
    if (szint > legerosebbKez.ertek) {
      legerosebbKez.ertek = szint;
      legerosebbKez.nev = nev;
    }
  }

  //=============================  Kártyák átalakítása, képként használata  =============================
  //Előlap kép
  function kartyakep(lap) {
    return `<img src="../Actual kártyák/${lap.szimbolum}/${lap.szam}.png"
      alt="${lap.szimbolum} ${lap.szam}"
      class="kartya">`;
  }

  //Hátlap kép
  function hatlap() {
    return `<img src="../Actual kártyák/Backside.png" class="kartya">`;
  }

  //=============================  Pakli létrehozása =============================
  function Pakliletrehozas() {
    osszlap = [];
    for (let i = 0; i < szimbolumok.length; i++) {
      for (let j = 0; j < szamok.length; j++) {
        osszlap.push({
          szimbolum: szimbolumok[i],
          szam: szamok[j],
          ertek: ertekek[j],
        });
      }
    }
    // ===== ÚJ: összekeverés =====
    for (let i = osszlap.length - 1; i > 0; i--) {
      const rand = Math.floor(Math.random() * (i + 1));
      [osszlap[i], osszlap[rand]] = [osszlap[rand], osszlap[i]];
    }
  }

  //=============================  Új leosztás / Reset =============================
  function reset() {
    kez = [];
    oszto = [];
    jatszolapok = [];
    kez_1_db = 1;
    kez_2_db = 1;
    kez_1_szimb = 0;
    kez_2_szimb = 0;
    Felforditott_db = 0;
    legerosebbKez = { ertek: 0, nev: "Magas lap" };

    Pakliletrehozas();

    // ===== Kéz kiosztása =====
    kez.push(osszlap.pop());
    kez.push(osszlap.pop());
    jatszolapok.push(kez[0], kez[1]);

    // ===== Asztali lapok előkészítése (de még nem mutatjuk) =====
    for (let i = 0; i < 5; i++) {
      let lap = osszlap.pop();
      oszto.push(lap);
      jatszolapok.push(lap);
    }

    megjelenit();
  }

  //=============================  Megjelenítés =============================
  function megjelenit() {
    // ===== Kéz =====
    document.getElementById("kez").innerHTML = "";
    for (let lap of kez) {
      document.getElementById("kez").innerHTML += kartyakep(lap);
    }

    // ===== Asztal =====
    document.getElementById("oszto").innerHTML = "";
    for (let i = 0; i < 5; i++) {
      if (i < Felforditott_db)
        document.getElementById("oszto").innerHTML += kartyakep(oszto[i]);
      else document.getElementById("oszto").innerHTML += hatlap();
    }

    kiert(); //Minden fordításnál kiértékelés
  }

  //=============================  Kiértékelés =============================
  function kiert() {
    kez_1_db = 1;
    kez_2_db = 1;
    kez_1_szimb = 0;
    kez_2_szimb = 0;
    legerosebbKez = { ertek: 0, nev: "Magas lap" };
    kezpar = kez[0].szam === kez[1].szam;

    // ===== Számoljuk a párokat és flösst a kijött lapok alapján =====
    for (let i = 0; i < Felforditott_db; i++) {
      let lap = oszto[i];
      if (kez[0].szam === lap.szam) kez_1_db++;
      if (kez[1].szam === lap.szam) kez_2_db++;

      if (kez[0].szimbolum === lap.szimbolum) kez_1_szimb++;
      if (kez[1].szimbolum === lap.szimbolum) kez_2_szimb++;
    }

    // ===== Párok / drill / póker =====
    if (kez_1_db === 4 || kez_2_db === 4) ertekeles(8, "Póker");
    else if (kez_1_db === 3 || kez_2_db === 3) ertekeles(4, "Drill");
    else if (kez_1_db === 2 || kez_2_db === 2) ertekeles(2, "Pár");

    // ===== Sor / színsor / royal =====
    let oszt_lap_ertekei = [];
    let osszesLap = [];

    for (let i = 0; i < kez.length; i++) {
      osszesLap.push(kez[i]);
    }

    for (let i = 0; i < oszto.length; i++) {
      osszesLap.push(oszto[i]);
    }

    for (let i = 0; i < 2 + Felforditott_db; i++) {
      oszt_lap_ertekei.push(osszesLap[i].ertek);
    }

    if (oszt_lap_ertekei.includes(14)) {
      oszt_lap_ertekei.push(1);
    }

    oszt_lap_ertekei.sort((a, b) => a - b); //A>B akkor A-B pozitiv -> Felcsereli oket, a kisebb B kerül előrébb

    let db = 0;
    for (let i = 0; i < oszt_lap_ertekei.length - 1; i++) {
      if (oszt_lap_ertekei[i] + 1 === oszt_lap_ertekei[i + 1]) db++;
      else if (oszt_lap_ertekei[i] !== oszt_lap_ertekei[i + 1]) db = 0;
    }
    if (db >= 4) ertekeles(5, "Sor");

    let vanFloss =
      (kez[0].szimbolum === kez[1].szimbolum &&
        kez_1_szimb + 2 === Felforditott_db + 2) ||
      kez_1_szimb === Felforditott_db + 2 ||
      kez_2_szimb === Felforditott_db + 2;
    if (vanFloss) ertekeles(6, "Flöss");

    if (db >= 4 && vanFloss) {
      let royal = [10, 11, 12, 13, 14];
      let talalat = 0;

      for (let i = 0; i < royal.length; i++) {
        if (oszt_lap_ertekei.includes(royal[i])) {
          talalat++;
        }
      }

      if (talalat === 5) {
        ertekeles(10, "Royal Flöss");
      } else {
        ertekeles(9, "Színsor");
      }
    }

    if (Felforditott_db > 0) {
      document.getElementById("tet").textContent =
        "Pontjaid: " + legerosebbKez.nev;
    }
  }

  //=============================  Next lap =============================
  function nextLap() {
    if (Felforditott_db < 5) {
      Felforditott_db++;
      megjelenit();
    }
  }

  //=============================  Események =============================
  document.getElementById("nextBtn").addEventListener("click", nextLap);
  document.getElementById("resetBtn").addEventListener("click", reset);

  //=============================  Kezdés =============================
  reset();
});
