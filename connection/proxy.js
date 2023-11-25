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
let backendPorts = []; 



// Simple load balancing function (picks a backend port randomly)
function loadBalancerPort() {
  if (backendPorts.length === 0) return undefined;
  // Pick the backend with the lowest average response time, but give a chance to pick other random backend
  if (Math.random() < 0.1) { // Can be changed
    const randomIndex = Math.floor(Math.random() * backendPorts.length);
    return backendPorts[randomIndex].number;
  } else {
    let minAverageTime = backendPorts[0].averageTime;
    let minAverageTimeIndex = 0;
    for (let i = 1; i < backendPorts.length; i++) {
      if (backendPorts[i].averageTime < minAverageTime) {
        minAverageTime = backendPorts[i].averageTime;
        minAverageTimeIndex = i;
      }
    }
    return backendPorts[minAverageTimeIndex].number;
  }
}

// basic heartbeat endpoint
// app.get("/ping", (_, res) => {
//   const json = { message: "pong" };
//   res.send(json);
// });

// Proxy route
app.all("/*", (req, res) => {

  const path = req.originalUrl.replace(/^\/api/, "");

  const backendPort = loadBalancerPort();
  const backendURL = `http://localhost:${backendPort}${path}`;

  console.log("Backend responsible for this request: ", backendPort)

  if (req == undefined || backendPort == undefined) {
    res.status(500).json({ success: false, error: "No active servers" });
    console.log("Request is undefined");
    return;
  }

  try {
    // Proxy the request to the backend
    if (path.includes("/list")) {
      console.log("Path:", path);
    }
    const backendRequest = request(backendURL);
    req.pipe(backendRequest).pipe(res);
    const startTime = new Date().getTime();
    // Update the average response time for the backend
    backendRequest.on('response', () => {
      // Calculate response time
      const endTime = new Date().getTime();
      const responseTime = endTime - startTime;

      // Update the average response time for the backend
      const backend = backendPorts.find((backend) => backend.number === backendPort);
      if (backend) {
        backend.averageTime = (backend.averageTime + responseTime) / 2;
        console.log(`Average response time for backend ${backendPort}: ${backend.averageTime}`);
      }
    });
  } catch (error) {
    console.error("Connection failed to backend: " + backendURL);
  }
});

app.use(bodyParser.json());
app.use(cors());

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
      // Check if the port is in backendPorts, if yes, the averageTime remains, else it is set to 0
      backendPorts = activePorts.map((port) => {
        const backendPort = backendPorts.find((backendPort) => backendPort.number === port);
        if (backendPort) {
          return backendPort;
        } else {
          return { number: port, averageTime: 0 };
        }
      });
      console.log("Active ports:", backendPorts);
      return backendPorts ?? [];
    })
    .catch((error) => {
      console.error("Error during server discoverability:", error.message);
      backendPorts = [];
      return [];
    });
}

setInterval(discoverActiveServer, 60000);