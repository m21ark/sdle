const zeromq = require("zeromq");

// WARNING THIS IS NOT WORKING FOR NOW

const proxy = new zeromq.Router(); // Use Router instead of raw socket type
proxy.bind("tcp://127.0.0.1:6000");
console.log("Backend proxy bound to port 6000");

const num_instances = 1; // TODO: HARD-CODED FOR NOW
const base_port = 5000; // TODO: HARD-CODED FOR NOW

const backendWorkers = [];

// Connect to backend workers
for (let i = 0; i < num_instances; i++) {
  const backendWorker = new zeromq.Dealer(); // Use Dealer instead of raw socket type
  const port = base_port + i;
  backendWorker.connect(`tcp://127.0.0.1:${port}`);
  console.log(`Connected to backend worker on port ${port}`);

  // Forward messages from the proxy to the worker
  proxy.on("message", (identity, ...frames) => {
    backendWorker.send([identity, "", ...frames]);
  });

  // Forward messages from the worker to the proxy
  backendWorker.on("message", (...frames) => {
    proxy.send([frames[0], "", ...frames.slice(1)]);
  });

  backendWorkers.push(backendWorker);
}

// Handle proxy errors
proxy.on("error", (err) => {
  console.error(`Proxy error: ${err}`);
});
