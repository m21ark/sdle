const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const port = 5600;

class HintedHandoff {
  constructor() {
    this.hints = new Map();
  }

  // Store a hint for the given recipient node
  storeHint(recipientNode, updateData) {
    if (!this.hints.has(recipientNode)) this.hints.set(recipientNode, []);
    const hintsForNode = this.hints.get(recipientNode);
    hintsForNode.push(updateData);
    this.hints.set(recipientNode, hintsForNode);
  }

  // Check and deliver hints to the recipient node if available
  deliverHints(recipientNode) {
    if (this.hints.has(recipientNode)) {
      const hintsForNode = this.hints.get(recipientNode);
      // Simulate delivering hints to the recipient node
      if (this.makeNodeDelivery(recipientNode, hintsForNode))
        this.hints.delete(recipientNode); // After successful delivery, remove hints
    } else {
      console.log(`No hints for node ${recipientNode}`);
    }
  }

  // Simulate the delivery process (you may replace this with your actual delivery logic)
  makeNodeDelivery(recipientNode, hints) {
    console.log(`Delivering hints to node ${recipientNode}:`, hints);
    return true;
  }
}

const app = express();
app.use(bodyParser.json());
app.use(cors());

const hintedHandoff = new HintedHandoff();

app.get("/ping", (_, res) => {
  const json = { message: "pong" };
  res.send(json);
});

// Endpoint to handle incoming requests
app.post("/update", (req, res) => {
  const { recipientNode, updateData } = req.body;
  console.log(`Received update for node ${recipientNode}:`, updateData);
  hintedHandoff.storeHint(recipientNode, updateData);
  res.status(200).json({ success: true });

  // Example request body:
  // {
  //   "recipientNode": "node1",
  //   "updateData": { ... }
  // }
});

// Endpoint to deliver hints to a node
app.post("/deliver_hints", (req, res) => {
  const { recipientNode } = req.body;
  console.log(`Delivering hints to node ${recipientNode}`);
  hintedHandoff.deliverHints(recipientNode);
  res.status(200).json({ success: true });

  // Example request body:
  // {
  //   "recipientNode": "node1"
  // }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
