# TrueChance - Casino szimulátor (vizsgaremek)

A **TrueChance** egy teljes stackes, böngészőből futó kaszinó szimulátor projekt.  
A frontend statikus fájlokból áll (HTML/CSS/JavaScript), a backend pedig Node.js + Express alapon fut, MySQL adatbázissal.

## Mi van benne?

- Felhasználói rendszer: regisztráció, bejelentkezés, kijelentkezés, session-kezelés
- Játékok: **Slot**, **Roulette**, **Blackjack**, **Texas Hold'em Poker**
- Kiegészítő oldalak: **Daily Cash**, **Statisztikáim**, **Ranglista**, **Profil**
- Admin felület felhasználó-kezeléssel
- Játékmenet naplózás és statisztika

## Tech stack

- **Frontend:** Vanilla JS, Bootstrap (lokálisan a projektben)
- **Backend:** Node.js, Express, express-session, bcrypt, mysql2
- **Adatbázis:** MySQL

## Projektstruktúra

```text
Truechance/
|- backend/
|  |- api/
|  |- sql/
|  |- package.json
|  |- server.js
|  `- nodemon.json
|- frontend/
|  |- html/
|  |- css/
|  |- javascript/
|  |- img/
|  `- bootstrap/
|- .gitignore
|- .prettierrc
`- readme.md
```

## Gyors indítás

### 1. Előfeltételek

- Node.js (ajánlott: LTS)
- MySQL (pl. XAMPP MariaDB is jó)

### 2. Adatbázis létrehozása

Importáld a sémát:

- `backend/sql/truechance.sql`

Opcióként teszt felhasználók:

- `backend/sql/teszt-felhasznalok.sql`

> A teszt felhasználók jelszava: `Teszt123!`

### 3. Függőségek telepítése

```bash
cd backend
npm install
```

### 4. Szerver indítása

Fejlesztés:

```bash
npm run dev
```

Éles mód:

```bash
npm start
```

### 5. Alkalmazás megnyitása

- `http://127.0.0.1:3000`

## Fontos oldalak

- Publikus: `/html/index.html`, `/html/auth.html`
- Védett: `/html/games.html`, `/html/slot.html`, `/html/roulette.html`, `/html/blackjack.html`, `/html/poker.html`, `/html/daily-cash.html`, `/html/statisztikaim.html`, `/html/ranglista.html`, `/html/profil.html`, `/html/admin.html`

## API rövid áttekintés

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Játékok

- Slot: `POST /api/slot/spin`, `GET /api/slot/statisztika`
- Roulette: `POST /api/roulette/spin`
- Blackjack: `GET /api/blackjack/user`, `POST /api/blackjack/init`, `POST /api/blackjack/hit`, `POST /api/blackjack/double`, `POST /api/blackjack/split`, `POST /api/blackjack/stand`
- Poker: `GET /api/poker/statisztika`, `POST /api/poker/uj`, `GET /api/poker/allapot`, `POST /api/poker/check`, `POST /api/poker/call`, `POST /api/poker/raise`, `POST /api/poker/fold`

### Egyéb

- Daily Cash: `GET /api/daily-cash/allapot`, `POST /api/daily-cash/porgetes`
- Profil: `GET /api/profile/adatok`, `PUT /api/profile/frissites`
- Ranglista: `GET /api/ranglista/felhasznalok`
- Statisztika: `GET /api/stats/jatekmenetek`
- Admin: `GET /api/admin/felhasznalok`, `PUT /api/admin/felhasznalo/:id`

## Jelenlegi fontos szabályok és működés

- **Roulette:** Jelenleg kizárólag 1 összeggel lehet több tétet tenni
- **Blackjack** Szigorú split (Teljesen egyező érték)

## Gyakori hibák

- PowerShell script tiltás esetén:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

- Foglalt port esetén:

```bash
npx kill-port 3000
```
