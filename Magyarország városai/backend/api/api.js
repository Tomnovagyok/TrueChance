const express = require('express');
const router = express.Router();
const database = require('../sql/database.js');
const fs = require('fs/promises');

//!Multer
const multer = require('multer'); //?npm install multer
const path = require('path');

const storage = multer.diskStorage({
    destination: (request, file, callback) => {
        callback(null, path.join(__dirname, '../uploads'));
    },
    filename: (request, file, callback) => {
        callback(null, Date.now() + '-' + file.originalname); //?egyedi név: dátum - file eredeti neve
    }
});

const upload = multer({ storage });

//!Endpoints:
//?GET /api/test
router.get('/test', (request, response) => {
    response.status(200).json({
        message: 'Ez a végpont működik.'
    });
});

//?GET /api/getallvtip
router.get('/getallvtip', async (request, response) => {
    try {
        const getAllVarosTip = await database.getAllVarosTip();
        response.status(200).json({ results: getAllVarosTip });
    } catch (error) {
        response.status(500).json({
            message: 'Ez a végpont nem működik.'
        });
    }
});

//?PUT /api/editVaros
router.put('/editVaros', upload.none(), async (request, response) => {
    try {
        const { id, vnev, jaras, kisterseg, nepesseg, terulet } = request.body;
        await database.editVaros(id, vnev, jaras, kisterseg, nepesseg, terulet);
        response.status(200).json({
            message: 'Sikeres szerkesztés.'
        });
    } catch (error) {
        response.status(500).json({
            message: 'Ez a végpont nem működik.'
        });
    }
});

//?DELETE /api/deleteVaros/:id
router.delete('/deleteVaros/:id', async (request, response) => {
    try {
        const id = request.params.id;
        await database.deleteVaros(id);
        response.status(200).json({
            message: 'Sikeres törlés.'
        });
    } catch (error) {
        response.status(500).json({
            message: 'Ez a végpont nem működik.'
        });
    }
});

//?GET /api/getallvip/:vtipid
router.get('/getallvip/:vtipid', async (request, response) => {
    try {
        const vtipid = request.params.vtipid;
        const getAllVaros = await database.vTipid(vtipid);
        response.status(200).json({ results: getAllVaros });
    } catch (error) {
        response.status(500).json({
            message: 'Ez a végpont nem működik.'
        });
    }
});

//?GET /api/testsql
router.get('/testsql', async (request, response) => {
    try {
        const selectall = await database.selectall();
        response.status(200).json({
            message: 'Ez a végpont működik.',
            results: selectall
        });
    } catch (error) {
        response.status(500).json({
            message: 'Ez a végpont nem működik.'
        });
    }
});

module.exports = router;
