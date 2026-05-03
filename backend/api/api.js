// Központi API router (router): Ide fut be az összes /api/... kérés,
// és innen irányítjuk tovább őket a megfelelő al-fájlokhoz (controller-ekhez).
const express = require('express');
const router = express.Router();

// Hitelesítés (bejelentkezés, regisztráció, kijelentkezés)
const authRouter = require('./auth.js');
router.use('/auth', authRouter);

// Slot router
const slotRouter = require('./slot.js');
router.use('/slot', slotRouter);

// Roulette router
const rouletteRouter = require('./roulette.js');
router.use('/roulette', rouletteRouter);

// Stats router
const statsRouter = require('./stats.js');
router.use('/stats', statsRouter);

// Profile router
const profileRouter = require('./profile.js');
router.use('/profile', profileRouter);

// Admin router
const adminRouter = require('./admin.js');
router.use('/admin', adminRouter);

// Ranglista router
const ranglistaRouter = require('./ranglista.js');
router.use('/ranglista', ranglistaRouter);

// Daily cash router
const dailyCashRouter = require('./daily-cash.js');
router.use('/daily-cash', dailyCashRouter);

// Blackjack router
const blackjackRouter = require('./blackjack.js');
router.use('/blackjack', blackjackRouter);

// Poker router (itt az útvonalak a fájlon belül is tartalmazzák a /poker/ prefixet, ezért ide a '/' elég)
const pokerRouter = require('./poker.js');
router.use('/', pokerRouter);

// Teszt endpoint
router.get('/test', (request, response) => {
    response.status(200).json({
        message: 'Ez a végpont működik.'
    });
});

module.exports = router;
