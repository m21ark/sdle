// server.js
const express = require('express');
const { exec } = require('child_process');
const cors = require('cors')
const fs = require('fs');
const path = require('path');
const sqlite3 = require('better-sqlite3'); // Import the better-sqlite3 module
const md5 = require("md5");

const app = express();
const port = 3000;

app.use(express.static('public')); // Serve the HTML and other static files
app.use(cors())

app.get('/lists', (req, res) => {
    const replicasDir = path.join(__dirname, '../db/replicas');

    fs.readdir(replicasDir, (err, replicas) => {
        if (err) {
            console.error(`Error: ${err}`);
            res.status(500).send('Internal Server Error');
            return;
        }

        let results = [];

        replicas.forEach(replica => {
            
            if (!replica.endsWith('.db')) {
                return;
            }

            console.log(replica);
            console.log(results);
            const dbPath = path.join(replicasDir, replica);
            const db = new sqlite3(dbPath); // Create a new database instance

            db.transaction(() => {
                const stmt = db.prepare('SELECT DISTINCT list_name FROM commitChanges');
                const rows = stmt.all();

                console.log(rows);
                results.push({ replica, lists: rows.map(row => { return { list_name: row.list_name, md5: md5(row.list_name.split('%')[0]) } }) });

                if (results.length === replicas.length - 1) {
                    res.send(results);
                }
            })();

            db.close(); // Close the database connection
        });
    });
});

app.get('/kill-proxy/:port', (req, res) => {
    const port = req.params.port;
    console.log(port);

    exec(`cd ../connection/ && kill -9 $(lsof -ti:${port}) && cd ../control_panel/`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            res.status(500).send('Internal Server Error');
        } else {
            console.log(`Process on port ${port} killed and control_panel directory changed`);
            res.send('Process killed successfully');
        }
    });

});

app.get('/check-replicas', (req, res) => {
    const replicasDir = path.join(__dirname, '../db/replicas');
    fs.readdir(replicasDir, (err, replicas) => {
        if (err) {
            console.error(`Error: ${err}`);
            res.status(500).send('Internal Server Error');
            return;
        }

        let results = [];

        replicas.forEach(replica => {
            if (!replica.endsWith('.db')) {
                return;
            }
            exec(`du -sh ${path.join(replicasDir, replica)} && sqlite3 ${path.join(replicasDir, replica)} "SELECT COUNT(*) FROM commitChanges"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error: ${stderr}`);
                    res.status(500).send('Internal Server Error');
                    return;
                }

                let [diskSpace, entries] = stdout.split('\n');
                diskSpace = diskSpace.split('\t')[0];
                results.push({ replica, diskSpace, entries });

                if (results.length === replicas.length - 1) {
                    res.send(results);
                }
            });
        });
    });
});

app.get('/start-proxy/:port', (req, res) => {
    const port = req.params.port;
    console.log(port);

    exec(`cd ../connection/ && node proxy.js ${port} && cd ../control_panel/`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            res.status(500).send('Internal Server Error');
        } else {
            console.log(`Process on port ${port} killed and control_panel directory changed`);
            res.send('Process started successfully');
        }
    });


});

app.get('/kill-process/:port', (req, res) => {
    const port = req.params.port;
    console.log(port);

    exec(`cd ../db/ && kill -9 $(lsof -ti:${port}) && cd ../control_panel/`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            res.status(500).send('Internal Server Error');
        } else {
            console.log(`Process on port ${port} killed and control_panel directory changed`);
            res.send('Process killed successfully');
        }
    });


});

app.get('/garbage-collection', (req, res) => {
    exec(`cd ../db/ && node garbage_collection.js && cd ../control_panel/`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            res.status(500).send('Internal Server Error');
        } else {
            console.log(`Garbage collection done and control_panel directory changed`);
            res.send('Garbage collection done successfully');
        }
    });


});

app.get('/start-process/:port', (req, res) => {
    const port = req.params.port;
    console.log(port);

    // Use a command to restart the process on the specified port
    exec(`cd ../db/ && node index.js ${port} && cd ../control_panel/`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            res.status(500).send('Internal Server Error');
        } else {
            console.log(`Process on port ${port} restarted and control_panel directory changed`);
            res.send('Process restarted successfully');
        }

    });

});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
