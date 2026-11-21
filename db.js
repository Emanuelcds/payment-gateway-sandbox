const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('payments.db');

const sql = fs.readFileSync(path.join(__dirname, 'db.sql'), 'utf8');
db.exec(sql);

module.exports = db;