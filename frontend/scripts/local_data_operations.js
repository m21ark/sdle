import { ShoppingList } from "../logic/shopping_list.js";

export let _shoppingLists = new Map(); // <list_name, ShoppingList>
export let _username = "";
export let online = true;

export const PROXY_DOMAIN = "localhost";
export const PROXY_PORT = "4000";


function load_previous_lists() {
  let lists = JSON.parse(localStorage.getItem("shoppingLists"));

  if (lists) {
    lists.forEach((list) => {
      let s = new ShoppingList();
      s.name = list;
      s.fromJSON(localStorage.getItem(list));
      _shoppingLists.set(list, s);
    });
  }
}

export function cache_name(name) {
  localStorage.setItem("username", name);
  _username = name;
}

export function load_name() {
  _username = localStorage.getItem("username");
}

export function cache_list_changes(list) {
  localStorage.setItem(
    "shoppingLists",
    JSON.stringify([..._shoppingLists.keys()])
  );
  localStorage.setItem(list.name, JSON.stringify(list));
}

export function cache_changes() {
  localStorage.setItem(
    "shoppingLists",
    JSON.stringify([..._shoppingLists.keys()])
  );

  _shoppingLists.forEach((list) => {
    localStorage.setItem(list.name, JSON.stringify(list));
  });
}

export function remove_list(listName) {
  if (myMap.has(listName)) _shoppingLists.delete(listName);
  else console.error("List does not exist");
  localStorage.removeItem(listName);
  cache_changes();
}

function fetch_commits(list) {
  const lastCommit = list.commitTimeline[list.commitTimeline.length - 1] || 0;
  const url = `http://${PROXY_DOMAIN}:${PROXY_PORT}/commits/${list.name}/${lastCommit}`;
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (data.length > 0) {
        for (let row of data) {
          let temp = new ShoppingList();
          temp.deserialize(row["commit_data"]);
          list.mergeDeltaChanges(row["commit_hash"], temp);
          cache_changes();
          // if active page list is the same as the list that was updated we need to update the page
          // TODO: Add to the list view the new changes
        }
      }
    })
    .catch((error) =>
      console.error(`Error fetching commits for ${list.name}: ${error}`)
    );
}

function push_changes(list) {
  // if there are no changes to push we can return
  const hasChanges = list.hasChanges(
    list.commitTimeline[list.commitTimeline.length - 1]
  );
  if (!hasChanges) return;

  // If there are changes we need to push them to the server
  let changes = new ShoppingList();
  changes.name = list.name;
  changes.products = list.dChanges;

  const data = {
    username: document.getElementById("username").textContent,
    data: JSON.stringify(changes), // TODO: we only need to pass the changes map but something in the serialization is not working
  };

  list.commitChanges(list.commitHashGen(), changes);

  const commitHash = list.commitTimeline[list.commitTimeline.length - 1];
  const url = `http://${PROXY_DOMAIN}:${PROXY_PORT}/list/${list.name}/${commitHash}`;

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      response.json();
    })
    .then((data) => {
      list.dChanges.clear();
      list.dChanges = new Map();
      cache_list_changes(list);
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

function toggleOnline() {
  // ITS stupid to be in this file, but there are problems with the imports
  console.log("toggle online");
  online = !online;
  if (online) {
    document.getElementById("online-status").textContent = "Online";
    document.getElementById("online-status").style.backgroundColor = "green";
  } else {
    document.getElementById("online-status").textContent = "Offline";
    document.getElementById("online-status").style.backgroundColor = "red";
  }
}

function switchOnline() {
  const onlineSwitch = document.querySelector("#online-status");
  onlineSwitch.addEventListener("click", toggleOnline);
}

// set a timeout that call the sync function every 5 seconds
setInterval(() => {
  if (online) {
    for (const [_, value] of _shoppingLists) {
      fetch_commits(value);
      push_changes(value);
    }
  }
}, 5000);

load_previous_lists();
load_name();
switchOnline();
console.log(_shoppingLists);