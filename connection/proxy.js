const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const request = require("request");

const app = express();

// Receive the port from the command line
const PORT = process.argv[2] || 5800;
// const PORT = 5800; // Port for clients
const MIN_PORT = 5500; // Minimum port for backend servers
const MAX_PORT = 5510; // Maximum port for backend servers

// Array of backend ports
let backendPorts = [5500, 5501, 5502]; // TODO: HARDCODED FOR NOW

app.use(bodyParser.json());
app.use(cors());

// Simple load balancing function (picks a backend port randomly)
function loadBalancerPort() {
  const randomIndex = Math.floor( Math.random() * 100) % backendPorts.length;
  return backendPorts[randomIndex];
}

// basic heartbeat endpoint
app.get("/ping", (_, res) => {
  const json = { message: "pong" };
  res.send(json);
});

// Proxy route
app.all("/*", (req, res) => {

  const path = req.originalUrl.replace(/^\/api/, "");


  const backendPort = loadBalancerPort();
  const backendURL = `http://localhost:${backendPort}${path}`;

  console.log("Backend responsible for this request: ", backendPort)

  if (req == undefined || backendPort == undefined) {
    res.status(500).json({ success: false, error: "No active replicas" });
    console.log("Request is undefined");
    return;
  }

  try {
    // Proxy the request to the backend
    if (path.includes("/list")) {
      console.log("Path:", path);
    }
    req.pipe(request(backendURL)).pipe(res);
  } catch (error) {
    console.error("Connection failed to backend: " + backendURL);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});


function discoverActiveServer() {
  async function serverDiscoverability(basePort, maxPort) {
    const activePorts = [];

    for (let port = basePort; port <= maxPort; port++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/ping`);
        if (response.ok) {
          const data = await response.json();
          if (data.message === "pong") {
            // The porsetInterval(updateActiveReplicas, 10000);t is reachable, add it to the active list
            if (!activePorts.includes(port)) activePorts.push(port);
          }
        }
      } catch (error) {
        // The port is not reachable, remove it from the active list
        const index = activePorts.indexOf(port);
        if (index !== -1) {
          activePorts.splice(index, 1);
          console.log(`Port ${port} is no longer active`);
        }
      }
    }

    return activePorts;
  };

  serverDiscoverability(MIN_PORT, MAX_PORT)
    .then((activePorts) => {
      backendPorts = activePorts;
      console.log("Active ports:", activePorts);
      return activePorts ?? [];
    })
    .catch((error) => {
      console.error("Error during server discoverability:", error.message);
      backendPorts = [];
      return [];
    });
}

setInterval(discoverActiveServer, 10000);