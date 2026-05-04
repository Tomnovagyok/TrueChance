// Központi API router (router): Ide fut be az összes /api/... kérés,
// és innen irányítjuk tovább őket a megfelelő al-fájlokhoz (controller-ekhez).
const express = require('express');
const router = express.Router();

const authRouter = require('./auth.js');
router.use('/auth', authRouter);

const slotRouter = require('./slot.js');
router.use('/slot', slotRouter);

const rouletteRouter = require('./roulette.js');
router.use('/roulette', rouletteRouter);

const statsRouter = require('./stats.js');
router.use('/stats', statsRouter);

const profileRouter = require('./profile.js');
router.use('/profile', profileRouter);

const adminRouter = require('./admin.js');
router.use('/admin', adminRouter);

const ranglistaRouter = require('./ranglista.js');
router.use('/ranglista', ranglistaRouter);

const dailyCashRouter = require('./daily-cash.js');
router.use('/daily-cash', dailyCashRouter);

const blackjackRouter = require('./blackjack.js');
router.use('/blackjack', blackjackRouter);

const pokerRouter = require('./poker.js');
router.use('/', pokerRouter);

router.get('/test', (request, response) => {
    response.status(200).json({
        message: 'Ez a végpont működik.'
    });
});

module.exports = router;
