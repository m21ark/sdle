const { Quorum } = require("./quorum");
const { ConsistentHashing } = require("./consistent_hashing");
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
app.use(bodyParser.json());
app.use(cors());

const consensusSize = 2; // TODO: make this variable
const quorumSize = 3; // TODO: make this variable
let consistentHashing = null;
const quorum = new Quorum(quorumSize, consensusSize);

app.get("/ping", (_, res) => {
  const json = { message: "pong" };
  res.send(json);
});


// Endpoint to handle incoming requests
app.all("/*", (req, res) => {
  // console.log("METHODE:", req.method);
  //if (req.originalUrl.includes("FIRST"))
  console.log("Request:", req.originalUrl);
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

function updateActiveReplicas() {
  quorum.discoverActiveReplicas(5000, 5100); // TODO Make these configs
  // add nodes to consistent hashing
  if (!consistentHashing && quorum.getReplicaActiveCount() > 0) {
    // weight is 1 for now, is good to have virtual nodes implemented but in our case there is not a real need for it
    const nodes = quorum.getReplicaPorts().map((port) => [port, 1]);
    consistentHashing = new ConsistentHashing(nodes);
    quorum.setConsistentHashing(consistentHashing);
  } // else ... lead with adds and removes ... note: teacher told us to not do this, as it implies to change the quorums
  // if the node is down then we pass to the following node in the quorum until an upper bound is reached
  // (example: 3 nodes in quorum, the first 2 are down, consensus of 2 is not reached and we abort)

  console.log("Active replicas:", quorum.getReplicaPorts());
}

setInterval(updateActiveReplicas, 10000);

// Start the web worker server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
