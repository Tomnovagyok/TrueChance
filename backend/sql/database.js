const mysql = require('mysql2/promise');

// Adatbázis kapcsolat készlet (pool): több párhuzamos kérést kezel egyszerre, nem kell minden alkalommal új kapcsolatot nyitni
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'truechance',
    waitForConnections: true,  // Ha minden kapcsolat foglalt, várjon szabad helyre
    connectionLimit: 10,       // Legfeljebb 10 párhuzamos adatbázis kapcsolat
    queueLimit: 0              // Korlátlan várakozó sor (0 = nincs limit)
});

// Felhasználó műveletek

// Regisztrációkor automatikusan 24 órával visszadátumozódik az utolsó daily cash porgétés,
// hogy az új játékos azonnal tudjon porgétni
async function felhasznaloLetrehoz(nev, email, jelszoHash) {
    const query = `
        INSERT INTO felhasznalok (nev, email, jelszo_hash, daily_cash_utolso_porgetes)
        VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL 24 HOUR))
    `;
    const [eredmeny] = await pool.execute(query, [nev, email, jelszoHash]);
    return eredmeny.insertId; // Az új sor ID-ját adja vissza
}

// Felhasználó keresése email alapján (bejelentkezéshez és regisztrációhoz)
async function felhasznaloEmailAltal(email) {
    const query = 'SELECT * FROM felhasznalok WHERE email = ?';
    const [sorok] = await pool.execute(query, [email]);
    return sorok[0];
}

// Felhasználó biztonságos adatainak lekérése ID alapján (a jelszó hash szándékosan ki van hagyva)
async function felhasznaloIdAltal(id) {
    const query = `
        SELECT id, nev, email, admin_e, egyenleg, letrehozva, daily_cash_utolso_porgetes
        FROM felhasznalok
        WHERE id = ?
    `;
    const [sorok] = await pool.execute(query, [id]);
    return sorok[0]; // undefined ha nem talált
}

// Felhasználó hitelesítési adatainak lekérése (jelszó csere vagy ellenőrzés)
async function felhasznaloIdAltalJelszovel(id) {
    const query = 'SELECT id, jelszo_hash FROM felhasznalok WHERE id = ?';
    const [sorok] = await pool.execute(query, [id]);
    return sorok[0];
}

// Jelszó frissítése a profil oldalon
async function felhasznaloJelszoFrissit(felhasznaloId, ujJelszoHash) {
    const query = 'UPDATE felhasznalok SET jelszo_hash = ? WHERE id = ?';
    await pool.execute(query, [ujJelszoHash, felhasznaloId]);
}

// Játékos egyenlegének azonnali frissítése a játékok után
async function egyenlegFrissit(felhasznaloId, ujEgyenleg) {
    const query = 'UPDATE felhasznalok SET egyenleg = ? WHERE id = ?';
    await pool.execute(query, [ujEgyenleg, felhasznaloId]);
}

// Statisztika és naplózás

// Minden játékmenet (pörgetés, leosztás) bejegyzése az adatbázisba
async function jatekmentNaploz(felhasznaloId, jatekTipus, tetOsszeg, nyeremeny, egyenlegUtan) {
    const query = `
        INSERT INTO jatekmenetek (felhasznalo_id, jatek_tipus, tet_osszeg, nyeremeny, egyenleg_utan)
        VALUES (?, ?, ?, ?, ?)
    `;
    await pool.execute(query, [felhasznaloId, jatekTipus, tetOsszeg, nyeremeny, egyenlegUtan]);
}

// Játékos korábbi játékmeneteinek listázása időrendben
async function jatekmenetekLekerese(felhasznaloId) {
    const query = `
        SELECT 
            id,
            jatek_tipus,
            tet_osszeg,
            nyeremeny,
            egyenleg_utan,
            jatszva
        FROM jatekmenetek 
        WHERE felhasznalo_id = ?
        ORDER BY jatszva DESC
    `;
    const [sorok] = await pool.execute(query, [felhasznaloId]);
    return sorok;
}

// Profil és Admin lekérdezések

// Felhasználó alap adatainak módosítása
async function felhasznaloProfilFrissit(felhasznaloId, nev, email) {
    const query = 'UPDATE felhasznalok SET nev = ?, email = ? WHERE id = ?';
    await pool.execute(query, [nev, email, felhasznaloId]);
}

// Ellenőrzi, hogy foglalt-e az új email cím profil szerkesztéskor
async function felhasznaloEmailMasAltal(email, aktualisFelhasznaloId) {
    const query = 'SELECT id FROM felhasznalok WHERE email = ? AND id <> ? LIMIT 1';
    const [sorok] = await pool.execute(query, [email, aktualisFelhasznaloId]);
    return !!sorok[0];
}

// Részletes statisztikai adatok (Win rate, ROI, profit) lekérése a profilhoz
async function felhasznaloProfilAdatokLekerese(felhasznaloId) {
    const felhasznalo = await felhasznaloIdAltal(felhasznaloId);
    if (!felhasznalo) {
        return null;
    }

    const osszesitettQuery = `
        SELECT
            COUNT(*) AS osszes_kor,
            COALESCE(SUM(tet_osszeg), 0) AS osszes_eljatszott_penz,
            COALESCE(
                SUM(
                    CASE
                        -- Pókernél a nyeremény negatív lehet (nettó veszteség), pozitív esetén az a valódi nyeremény
                        WHEN jatek_tipus = 'poker' AND nyeremeny > 0 THEN nyeremeny
                        -- Nem-póker: csak akkor nyert, ha a nyeremény TÖBB mint a tét (valódi profit rész)
                        WHEN jatek_tipus <> 'poker' AND nyeremeny > tet_osszeg THEN nyeremeny - tet_osszeg
                        ELSE 0
                    END
                ),
                0
            ) AS osszes_nyert_penz,
            COALESCE(
                SUM(
                    CASE
                        -- Póker: csak a negatív nyeremény számít veszteségnek
                        WHEN jatek_tipus = 'poker' AND nyeremeny < 0 THEN ABS(nyeremeny)
                        -- Nem-póker: csak ha a nyeremény kisebb mint a tét (veszteség = tét - visszakapott)
                        WHEN jatek_tipus <> 'poker' AND nyeremeny < tet_osszeg THEN tet_osszeg - nyeremeny
                        ELSE 0
                    END
                ),
                0
            ) AS osszes_vesztett_penz
        FROM jatekmenetek
        WHERE felhasznalo_id = ?
    `;
    const [osszesitettSorok] = await pool.execute(osszesitettQuery, [felhasznaloId]);

    // Játékonként csoportosítva: hány kört játszott és hányszor nyert az egyes játékokban
    const jatekonkentiQuery = `
        SELECT
            jatek_tipus,
            COUNT(*) AS osszes_kor,
            SUM(
                CASE
                    WHEN jatek_tipus = 'poker' AND nyeremeny > 0 THEN 1
                    WHEN jatek_tipus <> 'poker' AND nyeremeny > tet_osszeg THEN 1
                    ELSE 0
                END
            ) AS nyert_kor
        FROM jatekmenetek
        WHERE felhasznalo_id = ?
        GROUP BY jatek_tipus
    `;
    const [jatekonkentiSorok] = await pool.execute(jatekonkentiQuery, [felhasznaloId]);

    return {
        felhasznalo: felhasznalo,
        osszesitett: osszesitettSorok[0],
        jatekonkenti: jatekonkentiSorok
    };
}

// Az összes regisztrált felhasználó adatainak betöltése az admin panelhez
async function felhasznalokAdminLekerese() {
    const query = `
        SELECT id, nev, email, admin_e, egyenleg, letrehozva
        FROM felhasznalok
        ORDER BY id ASC
    `;
    const [sorok] = await pool.execute(query);
    return sorok;
}

// Legjobb játékosok listázása egyenleg alapján csökkenő sorrendben a ranglistához
async function ranglistaFelhasznalokLekerese() {
    const query = `
        SELECT id, nev, egyenleg
        FROM felhasznalok
        ORDER BY egyenleg DESC, nev ASC
    `;
    const [sorok] = await pool.execute(query);
    return sorok;
}

// Admin jogú módosítás egy adott felhasználó adatain
async function felhasznaloAdminFrissit(felhasznaloId, nev, email, egyenleg, adminE) {
    const query = `
        UPDATE felhasznalok
        SET nev = ?, email = ?, egyenleg = ?, admin_e = ?
        WHERE id = ?
    `;
    await pool.execute(query, [nev, email, egyenleg, adminE ? 1 : 0, felhasznaloId]);
}

// Daily Cash lekérdezések

// Ellenőrzi az egyenleget és az utolsó pörgetés idejét
async function dailyCashAllapotLekeres(felhasznaloId) {
    const query = `
        SELECT id, egyenleg, daily_cash_utolso_porgetes
        FROM felhasznalok
        WHERE id = ?
    `;
    const [sorok] = await pool.execute(query, [felhasznaloId]);
    return sorok[0];
}

// Napi bónusz jóváírása – az UPDATE csak akkor fut le, ha valóban eltelt 24 óra
// Ha más kérés már előbb frissített (versenyhelyzet), az affectedRows 0 lesz, és null-t adunk vissza
async function dailyCashPorgetesJovairas(felhasznaloId, nyeremeny) {
    const frissitesQuery = `
        UPDATE felhasznalok
        SET
            egyenleg = egyenleg + ?,
            daily_cash_utolso_porgetes = NOW()
        WHERE id = ?
          AND TIMESTAMPDIFF(SECOND, daily_cash_utolso_porgetes, NOW()) >= 86400
    `;
    const [frissitesEredmeny] = await pool.execute(frissitesQuery, [nyeremeny, felhasznaloId]);

    if (!frissitesEredmeny.affectedRows) {
        return null; // A feltétel nem teljesült (még nem telt el 24 óra)
    }

    return dailyCashAllapotLekeres(felhasznaloId); // Friss adatokkal tér vissza
}

// Export
module.exports = {
    felhasznaloLetrehoz,
    felhasznaloEmailAltal,
    felhasznaloIdAltal,
    felhasznaloIdAltalJelszovel,
    felhasznaloJelszoFrissit,
    egyenlegFrissit,
    jatekmentNaploz,
    jatekmenetekLekerese,
    felhasznaloProfilFrissit,
    felhasznaloEmailMasAltal,
    felhasznaloProfilAdatokLekerese,
    felhasznalokAdminLekerese,
    ranglistaFelhasznalokLekerese,
    felhasznaloAdminFrissit,
    dailyCashAllapotLekeres,
    dailyCashPorgetesJovairas
};
