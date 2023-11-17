const Quorum = require("./quorum");
const express = require("express");
let bodyParser = require("body-parser");
let cors = require("cors");

const port = process.argv[2]; // port is passed as an argument

if (!port) {
  console.error("Port not specified");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

const quorumSize = 2; // TO-DO: make this variable
const replicaPorts = [5000, 5001, 5002]; // TO-DO make this dynamic using discovery
const quorum = new Quorum(quorumSize, replicaPorts);

// Endpoint to handle incoming requests
app.get("/handleRequest", (req, res) => {
  // const requestData = req.body;
  const requestData = true; // TO-DO: remove this line and make requests work

  if (requestData) {
    quorum
      .consensus(requestData.data)
      .then((result) => {
        res.json({ success: true, result });
      })
      .catch((error) => {
        res.status(500).json({ success: false, error: error.message });
      });
  } else {
    res.status(400).json({ success: false, error: "Invalid request type" });
  }
});

app.get("/ping", (_, res) => {
  res.json({ success: true });
});

// Start the web worker server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
