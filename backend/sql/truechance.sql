CREATE DATABASE IF NOT EXISTS truechance CHARACTER SET utf8 COLLATE utf8_hungarian_ci;
USE truechance;

-- Minden regisztrált játékos adatait tárolja
CREATE TABLE IF NOT EXISTS felhasznalok (
    id INT AUTO_INCREMENT PRIMARY KEY, -- egyedi azonosító, automatikusan nő
    nev VARCHAR(100) NOT NULL, -- teljes név
    email VARCHAR(150) NOT NULL UNIQUE, -- email = belépési azonosító (nem lehet kétszer ugyanaz)
    jelszo_hash VARCHAR(255) NOT NULL, -- bcrypt-tel titkosított jelszó (SOHA nem plain text!)
    admin_e BOOLEAN NOT NULL DEFAULT FALSE, -- admin jogosultság (0 = nem admin, 1 = admin)
    daily_cash_utolso_porgetes DATETIME NOT NULL, -- daily cash utolsó pörgetés ideje
    egyenleg DECIMAL(10,2) NOT NULL DEFAULT 10000.00, -- virtuális egyenleg, alapértéke $10000
    letrehozva DATETIME NOT NULL DEFAULT NOW() -- mikor regisztrált
);

-- Minden egyes játék (pörgetés, kör) naplózódik ide
CREATE TABLE IF NOT EXISTS jatekmenetek (   
    id INT AUTO_INCREMENT PRIMARY KEY,
    felhasznalo_id INT NOT NULL, -- melyik felhasználó játszott
    jatek_tipus ENUM('slot', 'roulette', 'blackjack', 'poker') NOT NULL, -- melyik játék
    tet_osszeg DECIMAL(10,2) NOT NULL, -- feltett tét
    nyeremeny DECIMAL(10,2) NOT NULL, -- kapott összeg (0 ha vesztett)
    egyenleg_utan DECIMAL(10,2) NOT NULL, -- egyenleg a játék lefutása után
    jatszva DATETIME NOT NULL DEFAULT NOW(), -- mikor történt

    FOREIGN KEY (felhasznalo_id) REFERENCES felhasznalok(id) ON DELETE CASCADE -- Idegen kulcs: ha a felhasználót töröljük, a játékmenetek is törlődnek
);
