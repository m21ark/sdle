let express = require("express");
let sqlite3 = require("better-sqlite3");
let bodyParser = require("body-parser");
let cors = require("cors");

const port = process.argv[2]; // port is passed as an argument

let db = new sqlite3(`./replicas/database_${port}.db`);

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

// endpoint to get all lists from the database
app.get("/lists", (_, res) => {
  let response = queryAll("SELECT DISTINCT list_name FROM commitChanges");

  res.status(200).json(response);
});

// endpoint to remove given hashes from the database and
// add a new commit with the merged data
// this endpoint will be called by the garbage collector
app.post("/list/:list_name", (req, res) => {
  const listName = req.params.list_name;
  const data = req.body;
  const common_hashes = data.common_hashes;
  const mergedCommit = data.data;

  // remove commits with common_hashes
  for (const hash of common_hashes)
    queryRun("DELETE FROM commitChanges WHERE commit_hash = ?", [hash]);

  // Parse and stringify the commit_data without quotes around property names
  const parsedData = JSON.parse(mergedCommit.commit_data);
  let obj = {};
  for (const key in parsedData.delta) obj[`${key}`] = parsedData.delta[key].toString();

  const stringifiedItems = JSON.stringify(obj);
  const merged = `{"delta": ${stringifiedItems} }`;
  

  queryRun(
    "INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES (?, ?, ?, ?)",
    ["garbageCollector", listName, mergedCommit.commit_hash, merged]
  );

  res.status(200).json({ success: true });
});

app.get("/user_data/:username", (req, res) => {
  const username = req.params.username;

  let response = queryAll(
    "SELECT list_name FROM userLists WHERE user_name = ?",
    [username]
  );

  res.status(200).json(response);
});

app.post("/handoff", (req, res) => {
  const data = req.body.data;

  for (const commit of data) {
    const toStore = `{"delta": ${JSON.stringify(commit.commit_data.delta)} }`;

    queryRun(
      "INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES (?, ?, ?, ?)",
      [commit.username, commit.listName, commit.commitHash, toStore]
    );
  }

  res.status(200).json({ success: true });
});

app.post("/list/:list_name/:commit_hash", (req, res) => {
  const listName = req.params.list_name;
  const commitHash = req.params.commit_hash;
  const data = req.body;

  console.log("POST", data.username, listName, commitHash, data.data);

  // insert into userLists if pair (username, listName) does not exist
  queryRun(
    "INSERT INTO userLists (user_name, list_name) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM userLists WHERE user_name = ? AND list_name = ?)",
    [data.username, listName, data.username, listName]
  );

  queryRun(
    "INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES (?, ?, ?, ?)",
    [data.username, listName, commitHash, data.data]
  );

  res.status(200).json({ success: true });
});

app.get("/commits/:list_name/:commit_hash", (req, res) => {
  const listName = req.params.list_name;
  const commitHash = req.params.commit_hash;

  if (commitHash.includes("FIRST")) {
    let response = queryAll(
      "SELECT user_name, commit_hash, commit_data FROM commitChanges WHERE list_name = ?",
      [listName]
    );
    console.log("FIRST", response);
    res.status(200).json(response);
  } else {
    // TODO: its possible to have a better query/logic ... use last read commit hash
    // this logic has a problem ... the last commit from the client can be outdated with the last read commit
    // in other words ... after fetching some other user can have committed and the client will not know about it

    let response = queryAll(
      "SELECT user_name, commit_hash, commit_data FROM commitChanges WHERE list_name = ? " +
        "AND id > (SELECT id FROM commitChanges WHERE commit_hash = ?) and commit_hash <> ?",
      [listName, commitHash, commitHash]
    );
    console.log("OTHER", response);
    res.status(200).json(response);
  }
});

app.get("/list/:list_name/:username", (req, res) => {
  const listName = req.params.list_name;
  const username = req.params.username;

  console.log("GET", listName, username);
  if (username) {
    // insert into userLists if pair (username, listName) does not exist
    queryRun(
      "INSERT INTO userLists (user_name, list_name) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM userLists WHERE user_name = ? AND list_name = ?)",
      [username, listName, username, listName]
    );
  }

  let response = queryAll(
    "SELECT commit_hash, commit_data FROM commitChanges WHERE list_name = ?",
    [listName]
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
  const json = { message: "pong" };
  res.send(json);
});

app.listen(port, () => {
  console.log(`Replica is listening on port ${port}`);
});
