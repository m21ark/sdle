// server.js
const express = require('express');
const { exec } = require('child_process');
const cors = require('cors')

const app = express();
const port = 3000;

app.use(express.static('public')); // Serve the HTML and other static files
app.use(cors())

app.get('/kill-process/:port', (req, res) => {
    const port = req.params.port;
    console.log(port);

    exec(`cd ../db/ && kill -9 $(lsof -t -i:${port}) && cd ../control_panel/`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            res.status(500).send('Internal Server Error');
        } else {
            console.log(`Process on port ${port} killed and control_panel directory changed`);
        }
    });

    res.send('Process killed successfully');
});

app.get('/start-process/:port', (req, res) => {
    const port = req.params.port;
    console.log(port);

    // Use a command to restart the process on the specified port
    exec(`cd ../db/ && node index.js ${port} 2>&1 & && cd ../control_panel/`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            res.status(500).send('Internal Server Error');
        } else {
            console.log(`Process on port ${port} restarted and control_panel directory changed`);
        }
    });

    res.send('Process restarted successfully');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
