const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const request = require("request");

const app = express();

// Receive the port from the command line
const PORT = process.argv[2] || 5800;
// const PORT = 5800; // Port for clients

// Array of backend ports
let backendPorts = [5500, 5501, 5502]; // TODO: HARDCODED FOR NOW

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


function discoverActiveServer(minPort, maxPort) {
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

  serverDiscoverability(minPort, maxPort)
    .then((activePorts) => {
      backendPorts = activePorts;
      return activePorts ?? [];
    })
    .catch((error) => {
      console.error("Error during server discoverability:", error.message);
      backendPorts = [];
      return [];
    });
}

setInterval(discoverActiveServer, 10000);