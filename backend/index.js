const { Quorum } = require("./quorum");
const { ConsistentHashing } = require("./consistent_hashing");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const net = require("net");

// Check if the port is specified as an argument
const port = process.argv[2];
if (!port) {
  console.error("Port not specified");
  process.exit(1);
}

// Create the web worker server
const app = express();
app.use(bodyParser.json());
app.use(cors());

// TODO: make these argument
const consensusSize = 2;
const quorumSize = 3;

let consistentHashing = null;
const quorum = new Quorum(quorumSize, consensusSize);

// Endpoint to check if the server is running
app.get("/ping", (_, res) => {
  const json = { message: "pong" };
  res.send(json);
});

// Endpoint to handle incoming requests
app.all("/*", (req, res) => {
  if (quorum.getReplicaActiveCount() === 0) {
    res.status(500).json({ success: false, error: "No active replicas" });
    return;
  } else if (quorum.getReplicaActiveCount() < consensusSize) {
    res.status(500).json({
      success: false,
      error: "Quorum can't be reached with so few active replicas",
    });
    return;
  }

  if (req) {
    quorum
      .consensus(req)
      .then((result) => {
        res.json(result);
      })
      .catch((error) => {
        res.status(500).json({ success: false, error: error.message });
      });
  } else {
    res.status(400).json({ success: false, error: "Invalid request type" });
  }
});

// Check for active replicas every 10 seconds
function updateActiveReplicas() {
  try {
    quorum.discoverActiveReplicas(5000, 5100); // TODO Make these configs
    if (!consistentHashing && quorum.getReplicaActiveCount() > 0) {
      const nodes = quorum.getReplicaPorts().map((port) => [port, 1]);
      consistentHashing = new ConsistentHashing(nodes);
      quorum.setConsistentHashing(consistentHashing);
    }
    console.log("Active replicas:", quorum.getReplicaPorts());
  } catch (error) {
    console.error(error);
  }
}
setInterval(updateActiveReplicas, 10000);

// Start the web worker server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
