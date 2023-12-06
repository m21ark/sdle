const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const request = require("request");

const app = express();

// Receive the port from the command line
const PORT = 5900;
// const PORT = 5800; // Port for clients
const MIN_PORT = 4000; // Minimum port for proxy
const MAX_PORT = 4010; // Maximum port for proxy

// Array of proxy ports
let proxyPorts = [];
let currentIndex = 0;

// Simple load balancing function (picks a proxy port sequentially)
function loadBalancerPort() {
  console.log("Proxy ports: ", proxyPorts);
  if (proxyPorts.length == 0) {
    return undefined;
  }
  // Pick the next proxy port
  currentIndex = (currentIndex + 1) % proxyPorts.length;
  return proxyPorts[currentIndex];
}

// basic heartbeat endpoint
app.get("/ping", (_, res) => {
  const json = { message: "pong" };
  res.send(json);
});

// DNS route
app.all("/*", (req, res) => {
  const proxyPort = loadBalancerPort();

  console.log("Proxy responsible for this user: ", proxyPort);
  // Add cors headers
  res.header("Access-Control-Allow-Origin", "*");
  if (req == undefined || proxyPort == undefined) {
    res.status(500).json({ success: false, error: "No active proxies" });
    console.log("Request is undefined");
    return;
  }

  // Send the proxy port to the client
    res.status(200).json({ proxyPort: proxyPort });
});

app.use(bodyParser.json());
app.use(cors());

// Start the server
app.listen(PORT, () => {
  console.log(`DNS server listening on port ${PORT}`);
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
  }

  serverDiscoverability(MIN_PORT, MAX_PORT)
    .then((activePorts) => {
      // Check if the port is in proxyPorts, if yes, the averageTime remains, else it is set to 0
      proxyPorts = activePorts
      console.log("Active ports of proxies:", proxyPorts);
      return proxyPorts ?? [];
    })
    .catch((error) => {
      console.error("Error during server discoverability:", error.message);
      proxyPorts = [];
      return [];
    });
}

setInterval(discoverActiveServer, 4000);
