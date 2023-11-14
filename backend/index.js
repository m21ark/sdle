let express = require("express");
let sqlite3 = require("better-sqlite3");
let bodyParser = require("body-parser");
let cors = require("cors");

const port = process.argv[2]; // port is passed as an argument

let db = new sqlite3(`./backend/db/database_${port}.db`);

db.pragma("foreign_keys = ON");

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

app.post("/list/:list_name/:commit_hash", (req, res) => {
  const listName = req.params.list_name;
  const commitHash = req.params.commit_hash;
  const data = req.body;

  queryRun(
    "INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES (?, ?, ?, ?)",
    [data.username, listName, commitHash, data.data]
  );

  res.status(200).json({});
});

app.post("/list/:list_name/", (req, res) => {
  const listName = req.params.list_name;
  const username = req.body.username;

  let user_id = queryAll("SELECT id FROM users WHERE email = ?", [username]);

  // user not found
  if (user_id.length === 0) {
    res.status(400).json({});
    return;
  }

  user_id = user_id[0].id;

  const list_id = listName + Date.now().toString();

  queryRun(
    "INSERT INTO todo_lists (user_id, name, internal_id) VALUES (?, ?, ?)",
    [user_id, listName, list_id]
  );

  res.status(200).json({});
});

app.get("/commits/:list_name/:commit_hash", (req, res) => {
  const listName = req.params.list_name;
  const commitHash = req.params.commit_hash;

  // TODO: its possible to have a better query/logic
  // this logic has a problem ... the last commit from the client can be outdated with the last read commit
  // in other words ... after fetching some other user can have commited and the client will not know about it

  let response = queryAll(
    "SELECT commit_hash, commit_data FROM commitChanges WHERE list_name = ? " +
      "AND id > (SELECT id FROM commitChanges WHERE commit_hash = ?) and commit_hash <> ?",
    [listName, commitHash, commitHash]
  );

  res.status(200).json(response);
});

app.get("/list/:list_name", (req, res) => {
  const listName = req.params.list_name;

  let response = queryAll(
    "SELECT commit_hash, commit_data FROM commitChanges WHERE list_name = ?",
    [listName]
  );

  res.status(200).json(response);
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

app.listen(port);
