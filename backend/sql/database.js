const mysql = require('mysql2/promise');

//! Adatbázis kapcsolat pool
//?  A "pool" azt jelenti, hogy nem nyitunk-zárunk minden lekérdezésnél új kapcsolatot,
//?  hanem fenntartunk egy készletet (max 10 db), és abból kölcsönözzük ki-be a kapcsolatokat.
//?  Ez sokkal gyorsabb és stabilabb, mint minden alkalommal új kapcsolatot létrehozni.
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '', //?  XAMPP alapból jelszó nélkül fut, éles szerveren ezt változtasd meg!
    database: 'truechance',
    waitForConnections: true,
    connectionLimit: 10, //?  Maximum 10 párhuzamos adatbázis kapcsolat
    queueLimit: 0 //?  0 = korlátlan várakozási sor
});

//! Felhasználó lekérdezések
//?  Regisztrációhoz: új felhasználó beszúrása
async function felhasznaloLetrehoz(nev, email, jelszoHash) {
    const query = `
        INSERT INTO felhasznalok (nev, email, jelszo_hash, daily_cash_utolso_porgetes)
        VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL 24 HOUR))
    `;
    //?  A ? helyőrzők megvédik az SQL injection ellen - sosem fűzzük össze stringként!
    const [eredmeny] = await pool.execute(query, [nev, email, jelszoHash]);
    return eredmeny.insertId; //?  Visszaadja az újonnan létrehozott felhasználó id-ját
}

//?  Bejelentkezéshez: email alapján megkeresi a felhasználót (jelszó ellenőrzéshez kell)
async function felhasznaloEmailAltal(email) {
    const query = 'SELECT * FROM felhasznalok WHERE email = ?';
    const [sorok] = await pool.execute(query, [email]);
    return sorok[0]; //?  Ha nincs ilyen email, undefined-ot ad vissza
}

//?  Session-ből való felhasználó lekéréshez: id alapján keres
async function felhasznaloIdAltal(id) {
    const query = `
        SELECT id, nev, email, admin_e, egyenleg, letrehozva, daily_cash_utolso_porgetes
        FROM felhasznalok
        WHERE id = ?
    `;
    //?  Szándékosan NEM kérjük le a jelszo_hash mezőt - nem kell sehova, biztonságosabb nélküle
    const [sorok] = await pool.execute(query, [id]);
    return sorok[0];
}

//?  Egyenleg frissítésekor (nyerés/veszteség után)
async function egyenlegFrissit(felhasznaloId, ujEgyenleg) {
    const query = 'UPDATE felhasznalok SET egyenleg = ? WHERE id = ?';
    await pool.execute(query, [ujEgyenleg, felhasznaloId]);
}

//! Játékmenet naplózás

//?  Minden játék végén meghívjuk, hogy naplózzuk a történteket
//?  Ebből lesz majd a valós statisztika (nyerési %, ház előny, stb.)
async function jatekmentNaploz(felhasznaloId, jatekTipus, tetOsszeg, nyeremeny, egyenlegUtan) {
    const query = `
        INSERT INTO jatekmenetek (felhasznalo_id, jatek_tipus, tet_osszeg, nyeremeny, egyenleg_utan)
        VALUES (?, ?, ?, ?, ?)
    `;
    await pool.execute(query, [felhasznaloId, jatekTipus, tetOsszeg, nyeremeny, egyenlegUtan]);
}

//?  Felhasználó összes játékmenetének lekérése (legújabb elől)
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
    //?  ORDER BY jatszva DESC = legújabb játékok elől
    const [sorok] = await pool.execute(query, [felhasznaloId]);
    return sorok; //?  Visszaad egy tömböt az összes játékmenettel  
}

//! Profil lekérdezések
//?  Profil szerkesztéshez: név és email frissítése
async function felhasznaloProfilFrissit(felhasznaloId, nev, email) {
    const query = 'UPDATE felhasznalok SET nev = ?, email = ? WHERE id = ?';
    await pool.execute(query, [nev, email, felhasznaloId]);
}

//?  Ellenőrzi, hogy az emailt másik felhasználó használja-e
async function felhasznaloEmailMasAltal(email, aktualisFelhasznaloId) {
    const query = 'SELECT id FROM felhasznalok WHERE email = ? AND id <> ? LIMIT 1';
    const [sorok] = await pool.execute(query, [email, aktualisFelhasznaloId]);
    return !!sorok[0];
}

//?  Profil oldalhoz összesített statisztikák lekérése
async function felhasznaloProfilAdatokLekerese(felhasznaloId) {
    const felhasznalo = await felhasznaloIdAltal(felhasznaloId);
    if (!felhasznalo) {
        return null;
    }

    const osszesitettQuery = `
        SELECT
            COUNT(*) AS osszes_kor,
            COALESCE(SUM(tet_osszeg), 0) AS osszes_eljatszott_penz,
            COALESCE(SUM(CASE WHEN nyeremeny > 0 THEN nyeremeny ELSE 0 END), 0) AS osszes_nyert_penz,
            COALESCE(
                SUM(
                    CASE
                        WHEN jatek_tipus = 'poker' AND nyeremeny < 0 THEN ABS(nyeremeny)
                        WHEN jatek_tipus = 'poker' THEN 0
                        ELSE GREATEST(tet_osszeg - nyeremeny, 0)
                    END
                ),
                0
            ) AS osszes_vesztett_penz
        FROM jatekmenetek
        WHERE felhasznalo_id = ?
    `;
    const [osszesitettSorok] = await pool.execute(osszesitettQuery, [felhasznaloId]);

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

async function felhasznalokAdminLekerese() {
    const query = `
        SELECT id, nev, email, admin_e, egyenleg, letrehozva
        FROM felhasznalok
        ORDER BY id ASC
    `;
    const [sorok] = await pool.execute(query);
    return sorok;
}

async function ranglistaFelhasznalokLekerese() {
    const query = `
        SELECT id, nev, egyenleg
        FROM felhasznalok
        ORDER BY egyenleg DESC, nev ASC
    `;
    const [sorok] = await pool.execute(query);
    return sorok;
}

async function felhasznaloAdminFrissit(felhasznaloId, nev, email, egyenleg, adminE) {
    const query = `
        UPDATE felhasznalok
        SET nev = ?, email = ?, egyenleg = ?, admin_e = ?
        WHERE id = ?
    `;
    await pool.execute(query, [nev, email, egyenleg, adminE ? 1 : 0, felhasznaloId]);
}

async function dailyCashAllapotLekeres(felhasznaloId) {
    const query = `
        SELECT id, egyenleg, daily_cash_utolso_porgetes
        FROM felhasznalok
        WHERE id = ?
    `;
    const [sorok] = await pool.execute(query, [felhasznaloId]);
    return sorok[0];
}

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
        return null;
    }

    return dailyCashAllapotLekeres(felhasznaloId);
}

//! Export
module.exports = {
    felhasznaloLetrehoz,
    felhasznaloEmailAltal,
    felhasznaloIdAltal,
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
