// Creating a hints window
let hintsWindow = document.createElement("div");
hintsWindow.style.position = "fixed";
hintsWindow.style.right = "0";
hintsWindow.style.top = "0";
hintsWindow.style.width = "660px";
hintsWindow.style.height = "500px";
hintsWindow.style.overflow = "auto";
hintsWindow.style.backgroundColor = "#f8f8f8";
hintsWindow.style.border = "1px solid #ccc";
hintsWindow.style.padding = "10px";

// Create a notification
function generate_notification(text, type, timeout = 5000) {
  const toast = document.getElementById("notification-toast");
  const not_header = document.querySelector(".toast-header");
  const not_body = document.querySelector(".toast-body");

  not_body.textContent = text;
  not_header.className = `toast-header ${type}`;
  toast.classList.add("show");
  toast.style.zIndex = 1000;

  setTimeout(() => {
    toast.classList.remove("show");
    toast.style.zIndex = -1;
  }, timeout);
}

// Update hints data every 5 seconds
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
setInterval(updateHintsData, 5000);

// Simplify the hints data to be displayed in a table
function simplifyHintsData(hintsData) {
  let simplifiedData =
    "<table><tr><th>Replica</th><th>Hints</th><th>Username</th><th>List Name</th><th>Changes</th><th>Commit Hash</th></tr>";

  // Create a table row for each hint
  for (let key in hintsData) {
    hintsData[key].forEach((hint, index) => {
      let changes = Object.entries(hint.commit_data.delta)
        .map(([item, count]) => `${item}: ${count}`)
        .join(", ");
      simplifiedData += `<tr><td>${key}</td><td>${index + 1}</td><td>${hint.username
        }</td><td>${hint.listName}</td><td>${changes}</td><td>${hint.commitHash
        }</td></tr>`;
    });
  }
  simplifiedData += "</table>";
  return simplifiedData;
}

// Create a table of replicas and their data every 5 seconds
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
setInterval(createReplicasTable, 5000);

document.body.appendChild(hintsWindow);

// Create a hash ring for the replicas
const ringContainer = document.getElementById("ring-container");
const ringCircle = document.querySelector(".ring-circle");
const ringNodes = document.querySelectorAll(".ring-node");
const totalNodes = ringNodes.length;
const angle = 360 / totalNodes;

// Set the position of the hash ring
ringNodes.forEach((node, index) => {
  const nodeId = node.id;
  const nodeName = node.getAttribute("data-name");
  const nodeAngle = angle * index;
  const nodePosition = calculateNodePosition(nodeAngle, nodeId);
  node.style.top = nodePosition.y + "%";
  node.style.left = nodePosition.x + "%";
  node.style.transform = "translate(-50%, -50%)";
  node.innerHTML = nodeName;
});

// Calculate the position of each node in the hash ring
function calculateNodePosition(angle, nodeId) {
  const radius = 50;
  const centerX = 50;
  const centerY = 50;
  let hashValue = parseInt(nodeId, 16);
  const adjustedAngle = hashValue % Math.pow(2, 128);
  const radians = (adjustedAngle * Math.PI) / 180;
  const x = centerX + radius * Math.cos(radians);
  const y = centerY - radius * Math.sin(radians);
  return { x, y };
}

// Fetch the list data from the server and display it on the hash ring every 5 seconds
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

      data.forEach((node, _) => {
        node.lists.forEach((list, index) => {
          const listNode = document.createElement("div");
          listNode.classList.add("list-hash");
          listNode.setAttribute("data-name", node.replica);
          listNode.textContent = list.list_name.split("#")[0];
          let listNodeAngle = angle * index;
          const nodePosition = calculateNodePosition(listNodeAngle, list.md5);
          listNode.style.top = nodePosition.y + "%";
          listNode.style.left = nodePosition.x + "%";
          listNode.style.transform = "translate(-50%, -50%)";

          listContainer.appendChild(listNode);
        });
      });
    })
    .catch((error) => console.error(error));
}
setInterval(fetchListData, 5000);

// Kill replica nodes when clicked
ringNodes.forEach((node) => {
  node.addEventListener("click", () => {
    node.classList.toggle("active");
    const nodeId = node.getAttribute("data-name");

    if (node.classList.contains("active")) {
      fetch(`http://localhost:3000/kill-process/${nodeId}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.text();
        })
        .then((_) =>
          generate_notification(
            "successfully killed replica node " + nodeId,
            "bg-success"
          )
        )
        .catch((_) =>
          generate_notification(
            "Problem trying to kill replica node " + nodeId,
            "bg-danger"
          )
        );
    } else {
      fetch(`http://localhost:3000/start-process/${nodeId}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.text();
        })
      generate_notification(
        "successfully started replica node " + nodeId,
        "bg-success"
      )
    }
  });
});

// Garbage Collection button
const garbageCollection = document.getElementById("garbage-collection");
garbageCollection.addEventListener("click", () => {
  fetch(`http://localhost:3000/garbage-collection`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return response.text();
    })
    .then((_) =>
      generate_notification("Garbage Collection Done!", "bg-success")
    )
    .catch((_) =>
      generate_notification("Problem during garbage collection", "bg-danger")
    );
});

// Kill proxy nodes when clicked
const proxyList = document.querySelectorAll(".list-node");
proxyList.forEach((proxy) => {
  proxy.addEventListener("click", () => {
    const proxyId = proxy.getAttribute("data-name");

    proxy.classList.toggle("active");

    if (proxy.classList.contains("active")) {
      fetch(`http://localhost:3000/kill-proxy/${proxyId}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.text();
        })
        .then((_) =>
          generate_notification(
            "Successfully killed proxy " + proxyId,
            "bg-success"
          )
        )
        .catch((_) =>
          generate_notification(
            "Problem when trying to kill proxy " + proxyId,
            "bg-danger"
          )
        );
    } else {
      fetch(`http://localhost:3000/start-proxy/${proxyId}`)
      generate_notification(
        "Successfully started proxy " + proxyId,
        "bg-success"
      );
    }
  });
});
