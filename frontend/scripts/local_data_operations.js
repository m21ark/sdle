import { ShoppingList } from "../logic/shopping_list.js";
import { PNCounter } from "../logic/crdt.js";

export let _shoppingLists = new Map(); // <list_name, ShoppingList>
export let _username = "";

// TODO: this must be made dynamic via configuration file
export const PROXY_DOMAIN = "localhost";
export let PROXY_PORT = "4000";

// TODO: THIS CANT BE HERE... FIRST OF ALL WHAT IF THE PROXY IS NOT UP? OR THE WIFI IS OFF? THIS WILL GIVE ERROR --> i think we can assume DNS is always up
fetch(`http://${PROXY_DOMAIN}:5900/endpoint`)
  .then((response) => response.json())
  .then((data) => {
    PROXY_PORT = data.proxyPort;
  })
  .catch((error) =>
    console.warn(`Error in dns: ${error}), using default proxy`)
  );

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

export function list_item_rendering(id, item) {
  let plusButtonDisplay = item.value() <= 0 ? 'hidden' : '';
  let minusButtonDisplay = item.value() <= 1 ? 'hidden' : '';
  let checkBox = '', completed = '';
  if (item.value() === 0) {
    checkBox = 'checked'
    completed = 'completed'
  }

  return `<div class="item">\ 
    <span class="${completed}">${id}</span> \
    <div>
    <span class="quantity__minus" ${minusButtonDisplay}>-</span> \
    <span class="quantity ${completed}">${item.value()}</span> \
    <span class="quantity__plus" ${plusButtonDisplay}>+</span> \
    </div>
    <input type="checkbox" ${checkBox}/> \
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
    console.error("List does not exist: ", currList);
    return;
  }

  for (const [id, item] of items.products) {
    // if (item.value() === 0) continue;
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
      const currList = document.getElementById("current-list-name").textContent;

      if (_shoppingLists.has(currList)) {
        const listObj = _shoppingLists.get(currList);
        if (event.target.checked) {
          itemNameElement.classList.add("completed")
          listObj.removeFromList(itemNameElement.textContent);
        } else {
          itemNameElement.classList.remove("completed")
          listObj.addProduct(itemNameElement.textContent, 1);
        };
        
        cache_list_changes(listObj);
        render_list_again();
      } else console.warn("List does not exist");
      event.stopPropagation();
      event.preventDefault();
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
  console.log("Fetching commits for list: ", list.name);
  const lastCommit = list.lastCommit || "FIRST_COMMIT";
  const url = `http://${PROXY_DOMAIN}:${PROXY_PORT}/commits/${encodeURIComponent(
    list.name
  )}/${lastCommit}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.length > 0) {
      for (let row of data) {
        if (list.commitTimeline.includes(row["commit_hash"])) continue;

        console.log("Fetched new changes for list: ", list.name, row);

        let row_data = JSON.parse(row["commit_data"]);

        let temp = new ShoppingList();
        let prods = new Map();
        for (let [key, value] of Object.entries(row_data.delta)) {
          let quantity = parseInt(value);
          prods.set(key, new PNCounter());
          if (quantity > 0) prods.get(key).increment(quantity);
          else if (quantity < 0) prods.get(key).decrement(-quantity);
        }
        temp.products = prods;

        list.mergeDeltaChanges(row["commit_hash"], temp);
        cache_changes();
        render_list_again();
        
        // if active page list is the same as the list that was updated we need to update the page
        // TODO: Add to the list view the new changes
        list.lastCommitRead = row["commit_hash"];
      }
    } else console.log("No new commits found in fetch for list: " + list.name);
  } catch (e) {
    console.error(`Error fetching commits for ${list.name}: ${e}`);
  }
}

async function push_changes(list) {
  // if there are no changes to push we can return
  if (!list.hasChanges()) {
    console.log("No changes to push for list: " + list.name);
    return;
  }

  // TODO: shouldnt we check for availability of the server here?
  // because we are making a commit but if the server is not up
  // the commit will still be made and the future iteration
  // will not find any changes to push

  // If there are changes we need to push them to the server

  let temp = {};
  for (let [key, value] of list.dChanges) temp[key] = JSON.stringify(value);

  const data = {
    username: document.getElementById("username").textContent,
    data: JSON.stringify({ delta: temp }),
  };

  let tmp = new ShoppingList();
  tmp.name = list.name;
  tmp.products = list.dChanges;

  let hash = list.commitHashGen();
  list.commitChanges(hash, tmp);

  const commitHash = list.commitTimeline[list.commitTimeline.length - 1];
  const url = `http://${PROXY_DOMAIN}:${PROXY_PORT}/list/${encodeURIComponent(
    list.name
  )}/${commitHash}`;

  console.log("Pushing new changes for list: ", list.name, data);

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
  const onlineSwitch = document.querySelector("button#online-status");

  document.getElementById("online-text").textContent = "...";
  onlineSwitch.classList.add("clicked");

  await new Promise((r) => setTimeout(r, 1000));

  for (const [_, value] of _shoppingLists) {
    try {
      await fetch_commits(value);
      await push_changes(value);
    } catch (e) {
      console.log(e);
    }
  }

  document.getElementById("online-text").textContent = "Sync";
  onlineSwitch.classList.remove("clicked");
}

load_previous_lists();
load_name();

// Sync button event listener
const onlineSwitch = document.querySelector("button#online-status");
onlineSwitch.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  sync();
});
