// Szerver belépési pont és konfiguráció:
const express = require('express');
const session = require('express-session');
const path = require('path');
const database = require('./sql/database.js');

const app = express();
const router = express.Router();

// Szerver alapbeállítások
const ip = '127.0.0.1';
const port = 3000;

// Köztesrétegek (Middleware) beállítása
app.use(express.json()); // JSON formátumú kérések feldolgozása
app.set('trust proxy', 1);

// Munkamenet (Session) kezelés konfigurálása
app.use(
    session({
        secret: 'truechance_titkos_kulcs_2026',
        resave: false,
        saveUninitialized: false
    })
);

// Útvonal védelem (Hitelesítés ellenőrzése):

// Azoknak az oldalaknak a listája, amelyekhez bejelentkezés szükséges
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

// Middleware a védett útvonalak ellenőrzésére
app.use((request, response, next) => {
    const kertUtvonal = request.path;
    const vedettE = vedettOldalak.some((oldal) => kertUtvonal === oldal);

    // Ha az oldal védett és nincs aktív munkamenet (nincs bejelentkezve), átirányítás a login oldalra
    if (vedettE && !request.session.felhasznaloId) {
        return response.redirect('/html/auth.html');
    }

    next();
});

// Végpontok (API és Statikus fájlok):

// API végpontok csatlakoztatása
const apiEndpoints = require('./api/api.js');
app.use('/api', apiEndpoints);

// Frontend mappában lévő statikus fájlok (CSS, JS, képek) kiszolgálása
app.use(express.static(path.join(__dirname, '../frontend')));

// Alapértelmezett útvonal (Főoldal)
router.get('/', (request, response) => {
    response.sendFile(path.join(__dirname, '../frontend/html/index.html'));
});
app.use('/', router);

// Szerver indítása:
async function szerverInditas() {
    try {
        // Itt történhetne az adatbázis kapcsolat ellenőrzése vagy inicializálása
    } catch (hiba) {
        console.error('Adatbázis inicializálási hiba:', hiba);
        process.exit(1); // Sikertelen indítás esetén leállítás
    }

    // Szerver hallgatása a megadott porton
    app.listen(port, ip, () => {
        console.log(`Szerver elérhetősége: http://${ip}:${port}`);
    });
}

szerverInditas();
