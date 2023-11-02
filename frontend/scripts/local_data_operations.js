import { ShoppingList } from "../logic/shopping_list.js";

export var _shoppingLists = []; // TODO: should be a map of list names to list
export var _username = "";
export var online = true;

// let shoppingList = new ShoppingList();
// shoppingList.name = "Big list";
// shoppingList.addProduct("Banana", 10);
// shoppingList.addProduct("Apple", 5);
//
// localStorage.setItem("shoppingLists", JSON.stringify([shoppingList.name]));
// localStorage.setItem(shoppingList.name, JSON.stringify(shoppingList));

function load_previous_lists() {
  let lists = JSON.parse(localStorage.getItem("shoppingLists"));

  if (lists) {
    lists.forEach((list) => {
      let s = new ShoppingList();
      s.name = list;
      s.fromJSON(localStorage.getItem(list));
      _shoppingLists.push(s);
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
    JSON.stringify(_shoppingLists.map((list) => list.name))
  );
  localStorage.setItem(list.name, JSON.stringify(list));
}

export function cache_changes() {
  localStorage.setItem(
    "shoppingLists",
    JSON.stringify(_shoppingLists.map((list) => list.name))
  );

  _shoppingLists.forEach((list) => {
    localStorage.setItem(list.name, JSON.stringify(list));
  });
}

export function remove_list(listName) {
  _shoppingLists = _shoppingLists.filter((list) => list.name !== listName);
  localStorage.removeItem(listName);
  cache_changes();
}

function fetch_commits(list) {
  const lastCommit = list.commitTimeline[list.commitTimeline.length - 1] || 0;
  const url = `http://localhost:5000/commits/${list.name}/${lastCommit}`;
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

  return;
}

function commit_changes(list) {
  if (list.hasChanges(list.commitTimeline[list.commitTimeline.length - 1])) {
    let changes = new ShoppingList();
    changes.name = list.name;
    changes.products = list.dChanges;

    const data = {
      username: document.getElementById("username").textContent,
      data: JSON.stringify(changes), // TODO: we only need to pass the changes map but something in the serialization is not working
    };

    list.commitChanges(list.commitHash(), changes);

    const url = `http://localhost:5000/list/${list.name}/${
      list.commitTimeline[list.commitTimeline.length - 1]
    }`;

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
        // console.error('Error:', error);
      });
  }
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
    _shoppingLists.forEach((list) => {
      fetch_commits(list);
      commit_changes(list);
    });
  }
}, 5000);

load_previous_lists();
load_name();
switchOnline();
