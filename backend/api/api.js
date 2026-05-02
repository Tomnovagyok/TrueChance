const express = require('express');
const router = express.Router();

//!Multer - fájlfeltöltéshez (egyelőre nem használjuk, de a template-ben benne volt)

//!Auth router bekötése
//?  A bejelentkezés, regisztráció, kijelentkezés és session ellenőrzés
//?  a /api/auth/... útvonalon érhetők el
const authRouter = require('./auth.js');
router.use('/auth', authRouter);

//!Slot router bekötése
const slotRouter = require('./slot.js');
router.use('/slot', slotRouter);

//!Roulette router bekötése
const rouletteRouter = require('./roulette.js');
router.use('/roulette', rouletteRouter);

//!Stats router bekötése
//?  A statisztikák lekérése a /api/stats/... útvonalon
const statsRouter = require('./stats.js');
router.use('/stats', statsRouter);

//!Profile router bekötése
const profileRouter = require('./profile.js');
router.use('/profile', profileRouter);

//!Admin router bekötése
const adminRouter = require('./admin.js');
router.use('/admin', adminRouter);

//!Ranglista router bekötése
const ranglistaRouter = require('./ranglista.js');
router.use('/ranglista', ranglistaRouter);

//!Daily cash router bekötése
const dailyCashRouter = require('./daily-cash.js');
router.use('/daily-cash', dailyCashRouter);

//!Blackjack router bekötése
const blackjackRouter = require('./blackjack.js');
router.use('/blackjack', blackjackRouter);

//!Poker router bekötése
const pokerRouter = require('./poker.js');
router.use('/', pokerRouter); // A poker.js-ben már /poker/ prefix van az útvonalakon

//!Teszt endpoint
//?GET /api/test - gyors ellenőrzés, hogy a szerver él-e
router.get('/test', (request, response) => {
    response.status(200).json({
        message: 'Ez a végpont működik.'
    });
});

module.exports = router;
