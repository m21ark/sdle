const { Quorum } = require("./quorum");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const net = require("net");

const port = process.argv[2]; // port is passed as an argument

if (!port) {
  console.error("Port not specified");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

const quorumSize = 2; // TODO: make this variable
const quorum = new Quorum(quorumSize);

// Endpoint to handle incoming requests
app.get("/handleRequest", (req, res) => {
  // const requestData = req.body;
  const requestData = true; // TODO: remove this line and make requests work

  if (quorum.getReplicaActiveCount() === 0) {
    res.status(500).json({ success: false, error: "No active replicas" });
    return;
  } else if (quorum.getReplicaActiveCount() < quorumSize) {
    res.status(500).json({ success: false, error: "Quorum can't be reached" });
    return;
  }

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

function updateActiveReplicas() {
  quorum.discoverActiveReplicas(5000, 5100); // TODO Make these configs
  console.log("Active replicas:", quorum.getReplicaPorts());
}

setInterval(updateActiveReplicas, 10000);
