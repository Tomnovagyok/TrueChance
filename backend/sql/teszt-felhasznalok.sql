USE truechance;

-- Teszt felhasznalok import fajl
-- Minden itt beszurt felhasznalo jelszava: Teszt123!

INSERT INTO felhasznalok (
    nev,
    email,
    jelszo_hash,
    admin_e,
    daily_cash_utolso_porgetes,
    egyenleg,
    letrehozva
)
VALUES
    ('Teszt Elek', 'teszt.elek@truechance.local', '$2b$10$a5AxfjJrOKIYecClL3o1r.UUH/mPUR63Rj/rTDbeeMRKO7nYHicJK', 0, DATE_SUB(NOW(), INTERVAL 26 HOUR), 9500.00, DATE_SUB(NOW(), INTERVAL 90 DAY)),
    ('Kovacs Bela', 'kovacs.bela@truechance.local', '$2b$10$a5AxfjJrOKIYecClL3o1r.UUH/mPUR63Rj/rTDbeeMRKO7nYHicJK', 0, DATE_SUB(NOW(), INTERVAL 50 HOUR), 12340.50, DATE_SUB(NOW(), INTERVAL 80 DAY)),
    ('Nagy Anna', 'nagy.anna@truechance.local', '$2b$10$a5AxfjJrOKIYecClL3o1r.UUH/mPUR63Rj/rTDbeeMRKO7nYHicJK', 0, DATE_SUB(NOW(), INTERVAL 10 HOUR), 7420.25, DATE_SUB(NOW(), INTERVAL 70 DAY)),
    ('Szabo David', 'szabo.david@truechance.local', '$2b$10$a5AxfjJrOKIYecClL3o1r.UUH/mPUR63Rj/rTDbeeMRKO7nYHicJK', 0, DATE_SUB(NOW(), INTERVAL 120 HOUR), 20150.00, DATE_SUB(NOW(), INTERVAL 60 DAY)),
    ('Toth Marta', 'toth.marta@truechance.local', '$2b$10$a5AxfjJrOKIYecClL3o1r.UUH/mPUR63Rj/rTDbeeMRKO7nYHicJK', 0, DATE_SUB(NOW(), INTERVAL 30 HOUR), 11025.75, DATE_SUB(NOW(), INTERVAL 50 DAY)),
    ('Farkas Peter', 'farkas.peter@truechance.local', '$2b$10$a5AxfjJrOKIYecClL3o1r.UUH/mPUR63Rj/rTDbeeMRKO7nYHicJK', 1, DATE_SUB(NOW(), INTERVAL 5 HOUR), 30000.00, DATE_SUB(NOW(), INTERVAL 40 DAY))
ON DUPLICATE KEY UPDATE
    nev = VALUES(nev),
    jelszo_hash = VALUES(jelszo_hash),
    admin_e = VALUES(admin_e),
    daily_cash_utolso_porgetes = VALUES(daily_cash_utolso_porgetes),
    egyenleg = VALUES(egyenleg),
    letrehozva = VALUES(letrehozva);