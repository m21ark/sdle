let express = require('express');
let sqlite3 = require('better-sqlite3');
let bodyParser = require('body-parser');
let cors = require('cors');

let db = new sqlite3('./backend/db/database.db');

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


app.post('/list/:list_name/:commit', (req, res) => {
    const listName = req.params.list_name;
    const commitHash = req.params.commit;
    const data = req.body;

    console.log(data.username, listName, commitHash, data.data);

    db.serialize(() => {
        const stmt = db.prepare('INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES (?, ?, ?, ?)');
        stmt.run(data.username, listName, commitHash, data.data);
        stmt.finalize();
    });

    res.status(201).send('Commit added successfully');
});

app.get('/commits/:list_name/:commit_hash', (req, res) => {
    const listName = req.params.list_name;
    const commitHash = req.params.commit_hash;

    db.all('SELECT commit_hash, commit_data FROM commitChanges WHERE list_name = ? ' +
        'AND id > (SELECT id FROM commitChanges WHERE commit_hash = ?) and commit_hash <> ?',
        listName, commitHash, commitHash, (err, rows) => {
            if (err) {
                res.status(500).send('Internal Server Error');
            } else {
                const result = rows.map(row => ({
                    commit_hash: row.commit_hash,
                    commit_data: row.commit_data
                }));
                res.json(result);
            }
        });
});


app.get('/ping', (req, res) => {
    res.send('pong');
});

app.listen(5000)