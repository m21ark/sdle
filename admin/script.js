// Create a new div element
let hintsWindow = document.createElement("div");

// Style the div to appear in the right corner of the page
hintsWindow.style.position = "fixed";
hintsWindow.style.right = "0";
hintsWindow.style.top = "0";
hintsWindow.style.width = "500px";
hintsWindow.style.height = "500px";
hintsWindow.style.overflow = "auto"; // Add this line to make it scrollable
hintsWindow.style.backgroundColor = "#f8f8f8";
hintsWindow.style.border = "1px solid #ccc";
hintsWindow.style.padding = "10px";

// Populate the div with the hints data
async function updateHintsData() {
  try {
    let response = await fetch("http://localhost:5600/hints");

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    let data = await response.json();
    let hintsData = data.hints;

    let simplifiedData = simplifyHintsData(hintsData);

    hintsWindow.innerHTML = simplifiedData;
  } catch (error) {
    console.error(error);
  }
}

function simplifyHintsData(hintsData) {
  let simplifiedData =
    "<table><tr><th>Replica</th><th>Hints</th><th>Username</th><th>List Name</th><th>Changes</th><th>Commit Hash</th></tr>";

  for (let key in hintsData) {
    hintsData[key].forEach((hint, index) => {
      console.log(hint);
      console.log(hint.commit_data["delta"]);
      let changes = Object.entries(hint.commit_data.delta)
        .map(([item, count]) => `${item}: ${count}`)
        .join(", ");
      simplifiedData += `<tr><td>${key}</td><td>${index + 1}</td><td>${
        hint.username
      }</td><td>${hint.listName}</td><td>${changes}</td><td>${
        hint.commitHash
      }</td></tr>`;
    });
  }

  simplifiedData += "</table>";

  return simplifiedData;
}

setInterval(updateHintsData, 3000);

function createReplicasTable() {
  fetch("http://localhost:3000/check-replicas")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      let table =
        "<table><tr><th>Replica ID</th><th>Disk Space</th><th>Entries</th></tr>";

      data.forEach((replica) => {
        table += `<tr><td>${replica.replica}</td><td>${replica.diskSpace}</td><td>${replica.entries}</td></tr>`;
      });

      table += "</table>";

      const replicasContainer = document.getElementById("replicas-container");
      replicasContainer.innerHTML = table;
    })
    .catch((error) => console.error(error));
}

setInterval(createReplicasTable, 3000);

// Append the div to the body
document.body.appendChild(hintsWindow);
// You can use JavaScript to dynamically manage the nodes based on your data
// For example, you can add event listeners to the nodes for interaction.
const ringContainer = document.getElementById("ring-container");
const ringCircle = document.querySelector(".ring-circle");
const ringNodes = document.querySelectorAll(".ring-node");
const totalNodes = ringNodes.length;
const angle = 360 / totalNodes;

ringNodes.forEach((node, index) => {
  const nodeId = node.id;
  const nodeName = node.getAttribute("data-name");
  const nodeAngle = angle * index;
  const nodePosition = calculateNodePosition(nodeAngle, nodeId);
  node.style.top = nodePosition.y + "%";
  node.style.left = nodePosition.x + "%";
  node.style.transform = "translate(-50%, -50%)"; // Center the node within the container
  node.innerHTML = nodeName; // Set the node name as its content
});

function calculateNodePosition(angle, nodeId) {
  const radius = 50; // Adjust the radius as needed
  const centerX = 50; // Adjust the center X coordinate as needed
  const centerY = 50; // Adjust the center Y coordinate as needed

  // Calculate the hash value
  let hashValue = parseInt(nodeId, 16);

  // Adjust the angle based on the hash value
  const adjustedAngle = hashValue % Math.pow(2, 128);

  const radians = (adjustedAngle * Math.PI) / 180;
  const x = centerX + radius * Math.cos(radians);
  const y = centerY - radius * Math.sin(radians);
  return { x, y };
}

function fetchListData() {
  fetch("http://localhost:3000/lists")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      const listContainer = document.getElementById("ring-container");

      // Remove all the existing list nodes
      const listNodes = document.querySelectorAll(".list-hash");

      data.forEach((node, index) => {
        node.lists.forEach((list, index) => {
          const listNode = document.createElement("div");
          listNode.classList.add("list-hash");
          listNode.setAttribute("data-name", node.replica);
          listNode.textContent = list.list_name.split("#")[0];
          let listNodeAngle = angle * index;
          const nodePosition = calculateNodePosition(listNodeAngle, list.md5);
          listNode.style.top = nodePosition.y + "%";
          listNode.style.left = nodePosition.x + "%";
          listNode.style.transform = "translate(-50%, -50%)"; // Center the node within the container

          listContainer.appendChild(listNode);
        });
      });
    })
    .catch((error) => console.error(error));
}

setInterval(fetchListData, 3000);

ringNodes.forEach((node) => {
  node.addEventListener("click", () => {
    // Toggle the node state (on/off) or perform any other action
    node.classList.toggle("active");
    const nodeId = node.getAttribute("data-name");

    // Check if the node is active
    if (node.classList.contains("active")) {
      // Make an appropriate call to kill the process on the backend
      fetch(`http://localhost:3000/kill-process/${nodeId}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.text();
        })
        .then((data) => console.log(data))
        .catch((error) => console.error(error));
    } else {
      // Make an appropriate call to start the process on the backend
      // Replace the following URL with your actual start-process endpoint
      fetch(`http://localhost:3000/start-process/${nodeId}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.text();
        })
        .then((data) => console.log(data))
        .catch((error) => console.error(error));
    }
  });
});
function generate_notification(text, type, timeout = 5000) {
  const toast = document.getElementById("notification-toast");
  const not_header = document.querySelector(".toast-header");
  const not_body = document.querySelector(".toast-body");

  not_body.textContent = text;
  not_header.className = `toast-header ${type}`;

  toast.classList.add("show");

  // move toast to front in z-index
  toast.style.zIndex = 1000;

  setTimeout(() => {
    toast.classList.remove("show");
    toast.style.zIndex = -1;
  }, timeout);
}

// Garbage Collection
const garbageCollection = document.getElementById("garbage-collection");
garbageCollection.addEventListener("click", () => {
  // Make an appropriate call to start the process on the backend
  // Replace the following URL with your actual start-process endpoint
  fetch(`http://localhost:3000/garbage-collection`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // show notification with the response
      generate_notification("Garbage Collection Done!", "bg-success");
      return response.text();
    })
    .then((data) => console.log(data))
    .catch((error) => console.error(error));
});

const proxyList = document.querySelectorAll(".list-node");
proxyList.forEach((proxy) => {
  proxy.addEventListener("click", () => {
    const proxyId = proxy.getAttribute("data-name");

    proxy.classList.toggle("active");

    if (proxy.classList.contains("active")) {
      // Make an appropriate call to kill the proxy on the backend
      fetch(`http://localhost:3000/kill-proxy/${proxyId}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.text();
        })
        .then((data) => console.log(data))
        .catch((error) => console.error(error));
    } else {
      // Make an appropriate call to start the proxy on the backend
      // Replace the following URL with your actual start-proxy endpoint
      fetch(`http://localhost:3000/start-proxy/${proxyId}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.text();
        })
        .then((data) => console.log(data))
        .catch((error) => console.error(error));
    }
  });
});
