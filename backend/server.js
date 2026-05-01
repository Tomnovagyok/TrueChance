//!Module-ok importálása
const express = require('express'); //?npm install express
const session = require('express-session'); //?npm install express-session
const path = require('path');
const database = require('./sql/database.js');

//!Beállítások
const app = express();
const router = express.Router();

const ip = '127.0.0.1';
const port = 3000;

app.use(express.json()); //?Middleware JSON - kell ahhoz, hogy a request.body-ból olvasni tudjunk
app.set('trust proxy', 1); //?Middleware Proxy

//!Session beállítása
app.use(
    session({
        secret: 'truechance_titkos_kulcs_2026', //?Ezt éles szerveren egy hosszú, random stringre kell cserélni!
        resave: false,
        saveUninitialized: false //?false = csak akkor ment session-t, ha tényleg van benne adat (pl. belépés után)
    })
);

//!Védett oldalak listája
//?  Ezeket az oldalakat csak bejelentkezett felhasználó érheti el
//?  Ha valaki megpróbálja direktben megnyitni (pl. böngésző URL-jébe beírja), visszadobjuk az auth.html-re
const vedettOldalak = [
    '/html/games.html',
    '/html/slot.html',
    '/html/roulette.html',
    '/html/blackjack.html',
    '/html/poker.html',
    '/html/daily-cash.html',
    '/html/statisztikaim.html',
    '/html/ranglista.html',
    '/html/profil.html',
    '/html/admin.html'
];

//!Védett route middleware
//?  A middleware olyan kód, ami minden kérés előtt lefut.
//?  Ha a kért oldal a védett listán van ÉS nincs aktív session (= nincs bejelentkezve),
//?  akkor azonnal átirányítjuk a bejelentkezési oldalra, és a kérés nem ér el a statikus fájlokig.
app.use((request, response, next) => {
    const kertUtvonal = request.path; //?  Az URL útvonal része, pl. /html/games.html

    const vedettE = vedettOldalak.some((oldal) => kertUtvonal === oldal);
    //?  .some() = megnézi, hogy a védett oldalak listájában benne van-e a kért URL. ez olyan mint egy for ciklus csak rövidebb

    if (vedettE && !request.session.felhasznaloId) {
        //?  Ha védett oldalt kér le és nincs session → átirányítás
        return response.redirect('/html/auth.html');
    }

    next(); //?  Ha minden rendben, folytatódik a kérés feldolgozása
});

//!API endpoints bekötése
const apiEndpoints = require('./api/api.js');
app.use('/api', apiEndpoints);

//!Statikus fájlok kiszolgálása (frontend)
//?  Ez teszi elérhetővé a HTML, CSS, JS, képeket a böngészőből
//?  FONTOS: ez a sor a middleware UTÁN jön, különben a védett ellenőrzés nem futna le!
app.use(express.static(path.join(__dirname, '../frontend')));

//!Főoldal routing
router.get('/', (request, response) => {
    response.sendFile(path.join(__dirname, '../frontend/html/index.html'));
});
app.use('/', router);

//!Szerver futtatása
async function szerverInditas() {
    try {
    } catch (hiba) {
        console.error('Adatbázis inicializálási hiba:', hiba);
        process.exit(1);
    }

    app.listen(port, ip, () => {
        console.log(`Szerver elérhetősége: http://${ip}:${port}`);
    });
}

szerverInditas();
