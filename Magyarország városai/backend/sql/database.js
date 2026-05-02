const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'varosok',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

//!SQL Queries
async function getAllVarosTip() {
    const query = 'SELECT * FROM varostipus;';
    const [rows] = await pool.execute(query);
    return rows;
}

async function vTipid(id) {
    const query = 'SELECT * FROM varos WHERE vtipid = ?;';
    const [rows] = await pool.execute(query, [id]);
    return rows;
}

async function deleteVaros(id) {
    const query = 'DELETE FROM varos WHERE id = ?;';
    await pool.execute(query, [id]);
}

async function editVaros(id, vnev, jaras, kisterseg, nepesseg, terulet) {
    const query = 'UPDATE varos SET vnev = ?, jaras = ?, kisterseg = ?, nepesseg = ?, terulet = ? WHERE id = ?;';
    await pool.execute(query, [vnev, jaras, kisterseg, nepesseg, terulet, id]);
}

//!Export
module.exports = {
    getAllVarosTip,
    vTipid,
    deleteVaros,
    editVaros
};
