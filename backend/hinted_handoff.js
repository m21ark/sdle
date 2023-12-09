const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const port = 5600;

class HintedHandoff {
  constructor() {
    this.hints = new Map();
  }

  getHints() {
    // create a JSON object from the map
    const json = {};
    for (const [key, value] of this.hints.entries()) json[key] = value;
    return json;
  }

  // Store a hint for the given recipient node
  storeHint(recipientNode, updateData) {
    recipientNode = parseInt(recipientNode);
    if (!this.hints.has(recipientNode)) this.hints.set(recipientNode, []);
    const hintsForNode = this.hints.get(recipientNode);
    hintsForNode.push(updateData);
    this.hints.set(recipientNode, hintsForNode);
    console.log(this.hints);
  }

  // Check and deliver hints to the recipient node if available
  deliverHints(recipientNode) {
    recipientNode = parseInt(recipientNode);
    if (this.hints.has(recipientNode)) {
      const hintsForNode = this.hints.get(recipientNode);
      if (this.makeNodeDelivery(recipientNode, hintsForNode))
        this.hints.delete(recipientNode); // After successful delivery, remove hints
    } else console.log(`No hints for node ${recipientNode}`);
  }

  makeNodeDelivery(recipientNode, hints) {
    console.log(`Delivering hints to node ${recipientNode}:`, hints);

    const url = `http://localhost:${recipientNode}/handoff`;
    const data = { data: hints };

    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };

    fetch(url, options)
      .then((res) => res.json())
      .then((res) => {
        if (res.success !== true) {
          console.log("Error:", res);
          return false;
        }
      })
      .catch((err) => {
        console.log("Error:", err);
        return false;
      });

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

// endpoint to get hints map
app.get("/hints", (_, res) => {
  const json = { hints: hintedHandoff.getHints() };
  res.send(json);
});

// Endpoint to handle incoming requests
app.post("/update", (req, res) => {
  const recipientNode = req.body.node;
  const updateData = req.body.data;
  console.log(`Received update for node ${recipientNode}:`, updateData);
  hintedHandoff.storeHint(recipientNode, updateData);
  res.status(200).json({ success: true });
});

// Endpoint to deliver hints to a node
app.post("/deliver_hints/:nodePort", (req, res) => {
  const recipientNode = req.params.nodePort;
  console.log(`Delivering hints to node ${recipientNode}`);
  hintedHandoff.deliverHints(recipientNode);
  res.status(200).json({ success: true });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
