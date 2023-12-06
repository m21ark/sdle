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
      const l = localStorage.getItem(list);
      if (!l) {
        console.error("List does not exist in local storage: ", list);
        return;
      }
      s.fromJSON(l);
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
  if (_shoppingLists.has(listName)) _shoppingLists.delete(listName);
  else {
    console.error("List does not exist: " + listName);
    return;
  }
  localStorage.removeItem(listName);

  // update list counter
  const listCounter = document.getElementById("list-list-count");
  listCounter.textContent = `(${_shoppingLists.size})`;

  if (_shoppingLists.size === 0) {
    const error = document.getElementById("lists-list");
    const errorP = document.createElement("p");
    errorP.textContent = "No lists found";
    errorP.className = "no_list_found";
    error.appendChild(errorP);
  }

  cache_changes();
}

function toggleOnline() {
  // TODO: ITS stupid to be in this file, but there are problems with the imports
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

function list_item_rendering(id, item) {
  //<button class="btn btn-danger delete-button">X</button> \
  return `<div class="item">\ 
    <span>${id}</span> \
    <div>
    <span class="quantity__minus">-</span> \
    <span class="quantity">${item.value()}</span> \
    <span class="quantity__plus">+</span> \
    </div>
    <input type="checkbox" /> \
    </div>`;
}

function render_list_again() {
  const itemsContainer = document.getElementById("items");
  const currList = document.getElementById("current-list-name").textContent;

  if (currList === "") return;
  let items = null;
  let itemsHtml = "";

  if (_shoppingLists.has(currList)) {
    items = _shoppingLists.get(currList);
  } else {
    console.error("List does not exist");
    return;
  }

  for (const [id, item] of items.products) {
    if (item.value() === 0) continue;
    itemsHtml += list_item_rendering(id, item);
  }

  if (items) itemsContainer.innerHTML = itemsHtml;
  else if (document.getElementById("todo-list").children.length < 2) {
    addNoItemMessage();
  }

  const checkboxes = document.querySelectorAll(".item input[type=checkbox]");

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", function (event) {
      const itemNameElement = event.target.parentElement.children[0];

      if (event.target.checked) itemNameElement.classList.add("completed");
      else itemNameElement.classList.remove("completed");

      const currList = document.getElementById("current-list-name").textContent;

      if (_shoppingLists.has(currList)) {
        const listObj = _shoppingLists.get(currList);
        listObj.removeFromList(itemNameElement.textContent);
        cache_list_changes(listObj);
      } else console.warn("List does not exist");
    });
  });

  const plusButtons = document.querySelectorAll(".quantity__plus");
  plusButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      const itemNameElement =
        event.target.parentElement.parentElement.children[0];

      const currList = document.getElementById("current-list-name").textContent;

      if (_shoppingLists.has(currList)) {
        const listObj = _shoppingLists.get(currList);
        listObj.addProduct(itemNameElement.textContent, 1);
        cache_list_changes(listObj);
        render_list_again();
      } else console.warn("List does not exist");
    });
  });

  const minusButtons = document.querySelectorAll(".quantity__minus");
  minusButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      const itemNameElement =
        event.target.parentElement.parentElement.children[0];

      const currList = document.getElementById("current-list-name").textContent;

      if (_shoppingLists.has(currList)) {
        const listObj = _shoppingLists.get(currList);
        // check if item value is bigger than 0
        if (listObj.getQuantityToBuy(itemNameElement.textContent) > 0) {
          listObj.removeProduct(itemNameElement.textContent, 1);
          cache_list_changes(listObj);
          render_list_again();
        }
      } else console.warn("List does not exist");
    });
  });

  const itemNames = document.querySelectorAll(".item span");
  itemNames.forEach((itemName) => {
    if (itemName.classList.contains("completed")) {
      const checkbox = itemName.nextElementSibling;
      checkbox.checked = true;
    }
  });

  //update_item_count();
}

// ======================== SYNCHRONIZATION ========================

async function fetch_commits(list) {
  // console.log("Fetching commits for list: ", list.name);
  const lastCommit = list.lastCommit || "FIRST_COMMIT";
  const url = `http://${PROXY_DOMAIN}:${PROXY_PORT}/commits/${encodeURIComponent(
    list.name
  )}/${lastCommit}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.length > 0) {
      
      for (let row of data) {
        console.log("row: ", row);
        if (list.commitTimeline.includes(row["commit_hash"])) continue;

        console.log("Fetched new changes for list: ", list.name);
        console.log(row);

        let temp = new ShoppingList();
        temp.deserialize(row["commit_data"]);
        list.mergeDeltaChanges(row["commit_hash"], temp);
        cache_changes();
        render_list_again();
        // if active page list is the same as the list that was updated we need to update the page
        // TODO: Add to the list view the new changes
        list.lastCommitRead = row["commit_hash"];

      }
    } //  else console.log("No new commits found in fetch for list: " + list.name);
  } catch (e) {
    console.error(`Error fetching commits for ${list.name}: ${e}`);
  }
}

async function push_changes(list) {
  // if there are no changes to push we can return
  if (!list.hasChanges()) {
    // console.log("No changes to push for list: " + list.name);
    return;
  }

  // TODO: shouldnt we check for availability of the server here?
  // because we are making a commit but if the server is not up
  // the commit will still be made and the future iteration
  // will not find any changes to push

  // If there are changes we need to push them to the server
  let changes = new ShoppingList();
  changes.name = list.name;
  changes.products = list.dChanges;

  const data = {
    username: document.getElementById("username").textContent,
    data: JSON.stringify(changes), // TODO: we only need to pass the changes map but something in the serialization is not working
  };
  let hash = list.commitHashGen();
  list.commitChanges(hash, changes);

  const commitHash = list.commitTimeline[list.commitTimeline.length - 1];
  const url = `http://${PROXY_DOMAIN}:${PROXY_PORT}/list/${encodeURIComponent(
    list.name
  )}/${commitHash}`;

  console.log("Pushing new changes for list: ", list.name);
  console.log(changes);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    list.dChanges.clear();
    list.dChanges = new Map();
    cache_list_changes(list);
  } catch (error) {
    console.error(`Error pushing changes for list ${list.name}:`, error);
  }
}

async function sync() {
  if (!online) return;
  for (const [_, value] of _shoppingLists) {
    try {
      await fetch_commits(value);
      await push_changes(value);
    } catch (e) {
      console.log(e);
    }
  }
}

setInterval(sync, 5000);
load_previous_lists();
load_name();
switchOnline();
