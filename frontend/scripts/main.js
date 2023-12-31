import * as LocalData from "./local_data_operations.js";
import { ShoppingList } from "../logic/shopping_list.js";
import { toggle_view, render_list_items } from "./renderer.js";
import { PNCounter } from "../logic/crdt.js";

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

function add_share_link_listener() {
  function add_to_clipboard(shareableLink) {
    navigator.clipboard
      .writeText(shareableLink)
      .then(() => {
        generate_notification(
          "Copied sharable link to clipboard!",
          "bg-success"
        );
      })
      .catch((error) => {
        console.error("Failed to copy text: ", error);
      });
  }

  const shareButton = document.getElementById("share-button");

  shareButton.addEventListener("click", function () {
    const uniqueId = document.getElementById("current-list-name").textContent;
    let currentUrl = window.location.href;

    // replacing port 9000 with 9001 and vice-versa for easier demo
    const port = window.location.port;
    if (port === "9000") currentUrl = currentUrl.replace("9000", "9001");
    else if (port === "9001") currentUrl = currentUrl.replace("9001", "9000");

    const shareableLink = `${currentUrl}?get_id=${encodeURIComponent(
      uniqueId
    )}`;

    add_to_clipboard(shareableLink);
  });
}

async function reload_list(listId) {
  const lists = [...LocalData._shoppingLists.values()];
  const listExists = lists.find((list) => list.name === listId);
  //from lists remove the ones with name equal to empty string

  if (listExists) {
    generate_notification("List already exists!", "bg-danger");
    return;
  }

  if (listId) {
    const url = `http://${LocalData.PROXY_DOMAIN}:${
      LocalData.PROXY_PORT
    }/list/${encodeURIComponent(listId)}`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        let s = new ShoppingList();
        s.name = listId;

        for (let row of data) {
          let row_data = JSON.parse(row["commit_data"]);
          let prods = new Map();
          let temp = new ShoppingList();

          for (let [key, value] of Object.entries(row_data.delta)) {
            let quantity = parseInt(value);
            prods.set(key, new PNCounter());
            if (quantity > 0) prods.get(key).increment(quantity);
            else if (quantity < 0) prods.get(key).decrement(-quantity);
          }
          temp.products = prods;
          s.mergeDeltaChanges(row["commit_hash"], temp);
        }

        LocalData._shoppingLists.set(listId, s);
        LocalData.cache_changes();
        // change url and take the get_id
        generate_notification("List is being added!", "bg-success");
      })
      .catch((error) =>
        console.error(`Error fetching list ${listId}: ${error}`)
      );
  }
}

function add_list_by_url() {
  // if url has argument get_id then create a list with that id
  const urlParams = new URLSearchParams(window.location.search);
  const listId = urlParams.get("get_id");

  // check if there is already a list with that id
  const lists = [...LocalData._shoppingLists.values()];
  const listExists = lists.find((list) => list.name === listId);
  //from lists remove the ones with name equal to empty string

  if (listExists) {
    generate_notification("List already exists!", "bg-danger");
    return;
  }

  if (listId) {
    const url = `http://${LocalData.PROXY_DOMAIN}:${
      LocalData.PROXY_PORT
    }/list/${encodeURIComponent(listId)}/${encodeURIComponent(
      LocalData._username
    )}`;
    console.log(url);
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        let s = new ShoppingList();
        s.name = listId;

        for (let row of data) {
          let row_data = JSON.parse(row["commit_data"]);
          let prods = new Map();
          let temp = new ShoppingList();

          for (let [key, value] of Object.entries(row_data.delta)) {
            let quantity = parseInt(value);
            prods.set(key, new PNCounter());
            if (quantity > 0) prods.get(key).increment(quantity);
            else if (quantity < 0) prods.get(key).decrement(-quantity);
          }
          temp.products = prods;
          s.mergeDeltaChanges(row["commit_hash"], temp);
        }

        LocalData._shoppingLists.set(listId, s);
        LocalData.cache_changes();
        // change url and take the get_id
        generate_notification("List is being added!", "bg-success");

        setTimeout(() => {
          window.history.pushState({}, null, window.location.pathname);
          location.reload();
        }, 2000);
      })
      .catch((error) =>
        console.error(`Error fetching list ${listId}: ${error}`)
      );
  }
}

function add_list_item() {
  const itemNameInput = document.getElementById("item-name");
  const itemQuantityInput = document.getElementById("item-quantity");

  const itemName = itemNameInput.value.trim();
  const itemQuantity = itemQuantityInput.value.trim();

  if (itemName === "" || itemQuantity === "" || itemQuantity <= 0) {
    generate_notification(
      "Please enter a valid name and quantity!",
      "bg-danger"
    );
    return;
  }
  const currList = document.getElementById("current-list-name").textContent;
  let listObj = null;
  if (LocalData._shoppingLists.has(currList))
    listObj = LocalData._shoppingLists.get(currList);
  else {
    console.error("List does not exist");
    return;
  }

  listObj.addProduct(itemName, parseInt(itemQuantity));
  LocalData.cache_list_changes(listObj);

  render_list_items();
  cache_item_changes();
}

function cache_item_changes(deletedListParent = false) {
  const itemsContainer = document.getElementById("items");
  const currList = document.getElementById("current-list-name").textContent;
  if (currList === "" && !deletedListParent) {
    generate_notification("Please select a list!", "bg-danger");
    return;
  }
  const cacheLocation = "myitems_" + currList;
  localStorage.setItem(cacheLocation, itemsContainer.innerHTML);

  if (itemsContainer.children.length !== 0) {
    const noItemMessage = document.querySelector(".no_list_found");
    if (noItemMessage) noItemMessage.remove();
  }

  update_item_count();
}

function cache_list_changes() {
  const listContainer = document.getElementById("lists");
  localStorage.setItem("lists", listContainer.innerHTML);
  update_list_count();

  if (listContainer.children.length === 0) addNoListMessage();
  else {
    const noListMessage = document.querySelector(".no_list_found");
    if (noListMessage) noListMessage.remove();
  }
}

function update_item_count() {
  const itemsContainer = document.getElementById("items");
  const count = document.querySelector("#list-item-count");
  count.textContent = `(${itemsContainer.children.length})`;
}

function update_list_count() {
  const itemsContainer = document.getElementById("lists");
  const count = document.querySelector("#list-list-count");
  count.textContent = `(${itemsContainer.children.length})`;
}

function add_item_popup() {
  const showPopupButton = document.getElementById("floating-add-button");
  const popup = document.getElementById("popup-item");
  const overlay = document.getElementById("overlay-item");
  const closePopupButton = document.getElementById("close-popup-item");
  const addItemForm = document.getElementById("add-item-form");

  showPopupButton.addEventListener("click", function () {
    popup.style.display = "block";
    overlay.style.display = "block";
  });

  closePopupButton.addEventListener("click", function () {
    popup.style.display = "none";
    overlay.style.display = "none";
  });

  addItemForm.addEventListener("submit", function (e) {
    e.preventDefault();
    add_list_item();
    popup.style.display = "none";
    overlay.style.display = "none";

    // clear the inputs
    const itemNameInput = document.getElementById("item-name");
    const itemQuantityInput = document.getElementById("item-quantity");

    itemNameInput.value = "";
    itemQuantityInput.value = "";
  });
}

function add_list_popup() {
  const showPopupButton = document.getElementById("floating-add-button-list");
  const popup = document.getElementById("popup-list");
  const overlay = document.getElementById("overlay-list");
  const closePopupButton = document.getElementById("close-popup-list");
  const addItemForm = document.getElementById("add-list-form");

  showPopupButton.addEventListener("click", function () {
    popup.style.display = "block";
    overlay.style.display = "block";
  });

  closePopupButton.addEventListener("click", function () {
    popup.style.display = "none";
    overlay.style.display = "none";
  });

  addItemForm.addEventListener("submit", function (e) {
    e.preventDefault();
    add_list_to_list();

    popup.style.display = "none";
    overlay.style.display = "none";
  });
}

function add_list_to_list() {
  const listNameInput = document.getElementById("list-name");
  let listName = listNameInput.value.trim();

  listNameInput.value = "";

  if (listName === "") {
    generate_notification("Please enter a name!", "bg-danger");
    return;
  }

  const newList = new ShoppingList(undefined, undefined, undefined, listName);
  listName = newList.name; // update name with internal name changes
  LocalData._shoppingLists.set(listName, newList);
  LocalData.cache_changes();

  const listContainer = document.getElementById("lists");

  const listDiv = document.createElement("div");
  listDiv.className = "list";

  const listNameElement = document.createElement("a");
  listNameElement.textContent = listName.split("#")[0];
  listNameElement.className = "a-list-name";
  listNameElement.dataset.name = listName;

  listNameElement.addEventListener("click", () => {
    document.getElementById("current-list-name").textContent = listName;
    document.getElementById("list-name-title").textContent =
      listName.split("#")[0];
    toggle_view();
    render_list_items();
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn btn-danger delete-button-list";
  deleteButton.textContent = "X";

  // add event listener to delete button
  deleteButton.addEventListener("click", function (event) {
    const res = confirm("Are you sure you want to delete this list?");
    if (!res) return;
    const listDiv = event.target.parentElement;
    listContainer.removeChild(listDiv);

    // clear the lists items
    const itemsContainer = document.getElementById("items");
    itemsContainer.innerHTML = "";
    LocalData.remove_list(listName);
  });

  listDiv.appendChild(deleteButton);
  listDiv.appendChild(listNameElement);

  listContainer.appendChild(listDiv);

  listNameInput.value = "";

  cache_list_changes();
}

function add_go_back_listener() {
  const burger = document.getElementById("burger-icon");
  burger.addEventListener("click", toggle_view);
}

async function setLists(data) {
  for (let list of data) {
    reload_list(list.list_name);
  }
}

function login_modal() {
  // // add the username to the navbar
  const username = document.getElementById("username");
  // ask the user for the username

  while (LocalData._username == "" || LocalData._username == null) {
    // ask user if he already has an account or not
    const res = confirm("Do you have an account?");

    if (res) {
      username.value = prompt("Please enter your username");

      if (username.value) {
        let user = username.value.trim();

        fetch(
          `http://${LocalData.PROXY_DOMAIN}:${
            LocalData.PROXY_PORT
          }/user_data/${encodeURIComponent(user)}`
        )
          .then((response) => response.json())
          .then((data) => {
            console.log(data);
            // for every list visit the url with ?get_id=<list_name>
            setLists(data).then(() => {
              setTimeout(() => {
                window.history.pushState({}, null, window.location.pathname);
                location.reload();
              }, 2000);
            });
          })
          .catch((error) => {
            console.error(`Error fetching user ${user}: ${error}`);
          });

        LocalData.cache_name(user);
      }
    } else {
      // create a new account
      const hash = Math.random().toString(36).substring(2, 10);
      username.value = prompt("Please enter your username");
      if (username.value)
        LocalData.cache_name(
          `${username.value.trim().replace(" ", "")}#${hash}`
        );
    }
  }

  username.textContent = LocalData._username;
}

function logout_listener() {
  const logoutButton = document.getElementById("logout-button");
  logoutButton.addEventListener("click", () => {
    const res = confirm("Are you sure you want to logout?");
    if (!res) return;

    localStorage.clear();
    window.location.href = "/";
  });
}

function addListenersCopyUsername() {
  const copyButton = document.getElementById("username");
  copyButton.addEventListener("click", () => {
    navigator.clipboard
      .writeText(LocalData._username)
      .then(() => {
        generate_notification(
          "Copied username to clipboard!",
          "bg-success",
          1500
        );
      })
      .catch((error) => {
        console.error("Failed to copy text: ", error);
      });
  });
}

add_go_back_listener();
add_list_popup();
add_item_popup();
update_item_count();
update_list_count();
add_share_link_listener();
login_modal();
add_list_by_url();
logout_listener();
addListenersCopyUsername();
