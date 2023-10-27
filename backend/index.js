let express = require('express');
let sqlite3 = require('better-sqlite3');
let bodyParser = require('body-parser');
let cors = require('cors');

let db = new sqlite3('./database.db');

let app = express();
app.use(cors());
app.use(bodyParser.json());

function queryAll(sql, params = []) {
    let stmt = db.prepare(sql);
    return stmt.all(...params);
}

function queryRun(sql, params = []) {
    let stmt = db.prepare(sql);
    return stmt.run(...params);
}


app.get('/ping', (req, res) => {
    res.send('pong');
});

app.listen(5000)