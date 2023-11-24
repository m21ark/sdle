const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const request = require("request");

const app = express();
const PORT = 5800; // Port for clients

// Array of backend ports
const backendPorts = [5500, 5501, 5502]; // TODO: HARDCODED FOR NOW

app.use(bodyParser.json());
app.use(cors());

// Simple load balancing function (picks a backend port randomly)
function loadBalancerPort() {
  const randomIndex = Math.floor(Math.random() * backendPorts.length);
  return backendPorts[randomIndex];
}

// basic heartbeat endpoint
app.get("/ping", (_, res) => {
  res.json({ success: true });
});

// Proxy route
app.all("/*", (req, res) => {
  console.log("Request:", req.originalUrl);

  const path = req.originalUrl.replace(/^\/api/, "");

  console.log("Path:", path);

  const backendPort = loadBalancerPort();
  const backendURL = `http://localhost:${backendPort}${path}`;

  console.log("Backend URL:", backendURL);

  if (req == undefined) {
    console.log("Request is undefined");
    return;
  }

  try {
    // Proxy the request to the backend
    req.pipe(request({ url: backendURL })).pipe(res);
  } catch (error) {
    console.error("Connection failed to backend: " + backendURL);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});
