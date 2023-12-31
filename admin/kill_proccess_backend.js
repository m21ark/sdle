const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("better-sqlite3");
const md5 = require("md5");

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(cors());


// get list on the replicas
app.get("/lists", (req, res) => {
  const replicasDir = path.join(__dirname, "../db/replicas");

  fs.readdir(replicasDir, (err, replicas) => {
    if (err) {
      console.error(`Error: ${err}`);
      res.status(500).send("Internal Server Error");
      return;
    }

    let results = [];

    replicas.forEach((replica) => {
      if (!replica.endsWith(".db")) {
        return;
      }

      const dbPath = path.join(replicasDir, replica);
      const db = new sqlite3(dbPath);

      db.transaction(() => {
        const stmt = db.prepare("SELECT DISTINCT list_name FROM commitChanges");
        const rows = stmt.all();

        results.push({
          replica,
          lists: rows.map((row) => {
            return {
              list_name: row.list_name,
              md5: md5(row.list_name.split("#")[0]),
            };
          }),
        });

        if (results.length === replicas.length - 1) {
          res.send(results);
        }
      })();

      db.close();
    });
  });
});

// kills the proxy running on port
app.get("/kill-proxy/:port", (req, res) => {
  const port = req.params.port;
  console.log(port);

  exec(
    `cd ../connection/ && kill -9 $(lsof -ti:${port}) && cd ../admin/`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${stderr}`);
        res.status(500).send("Internal Server Error");
      } else {
        console.log(
          `Process on port ${port} killed and admin directory changed`
        );
        res.send("Process killed successfully");
      }
    }
  );
});

// check replica info, disk space and number of entries
app.get("/check-replicas", (req, res) => {
  const replicasDir = path.join(__dirname, "../db/replicas");
  fs.readdir(replicasDir,
    (err, replicas) => {
      if (err) {
        console.error(`Error: ${err}`);
        res.status(500).send("Internal Server Error");
        return;
      }

      let results = [];

      replicas.forEach((replica) => {
        if (!replica.endsWith(".db")) {
          return;
        }
        exec(
          `du -sh ${path.join(replicasDir, replica)} && sqlite3 ${path.join(
            replicasDir,
            replica
          )} "SELECT COUNT(*) FROM commitChanges"`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`Error: ${stderr}`);
              res.status(500).send("Internal Server Error");
              return;
            }

            let [diskSpace, entries] = stdout.split("\n");
            diskSpace = diskSpace.split("\t")[0];
            results.push({ replica, diskSpace, entries });

            if (results.length === replicas.length - 1) {
              res.send(results);
            }
          }
        );
      });
    });
});

// start proxy on port
app.get("/start-proxy/:port", (req, res) => {
  const port = req.params.port;
  console.log(port);

  exec(
    `cd ../connection/ && node proxy.js ${port} && cd ../admin/`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${stderr}`);
        res.status(500).send("Internal Server Error");
      } else {
        console.log(
          `Process on port ${port} killed and admin directory changed`
        );
        res.send("Process started successfully");
      }
    }
  );
});

// kill replica node on port
app.get("/kill-process/:port", (req, res) => {
  const port = req.params.port;
  console.log(port);

  exec(
    `cd ../db/ && kill -9 $(lsof -ti:${port}) && cd ../admin/`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${stderr}`);
        res.status(500).send("Internal Server Error");
      } else {
        console.log(
          `Process on port ${port} killed and admin directory changed`
        );
        res.send("Process killed successfully");
      }
    }
  );
});

// perform garbage collection
app.get('/garbage-collection', (req, res) => {
  console.log('Garbage collection started');
  exec(
    'cd ../db/ && node garbage_collection.js && cd ../admin/',
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${stderr}`);
        res.status(500).send('Internal Server Error');
      } else {
        console.log('Garbage collection done and admin directory changed');
        res.send(`Garbage collection done successfully\n${stdout}`);
      }
    }
  );
});

// start replica node on port
app.get("/start-process/:port", (req, res) => {
  const port = req.params.port;
  console.log(port);

  exec(
    `cd ../db/ && node index.js ${port} && cd ../admin/`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${stderr}`);
        res.status(500).send("Internal Server Error");
      } else {
        console.log(
          `Process on port ${port} restarted and admin directory changed`
        );
        res.status(200).send("Process restarted successfully");
      }
    }
  );
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
