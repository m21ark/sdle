import * as LocalData from './local_data_operations.js'
import { ShoppingList } from "../logic/shopping_list.js";
import { toggle_view, render_list_items } from './renderer.js';

function generate_notification(text, type) {
  const toast = document.getElementById("notification-toast");
  const not_header = document.querySelector(".toast-header");
  const not_body = document.querySelector(".toast-body");

  not_body.textContent = text;
  not_header.className = `toast-header ${type}`;

  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 5000);
}


function add_share_link_listener() {
  function add_to_clipboard(shareableLink) {
    navigator.clipboard
      .writeText(shareableLink)
      .then(() => {
        generate_notification("Copied to clipboard!", "bg-success");
      })
      .catch((error) => {
        console.error("Failed to copy text: ", error);
      });
  }

  const shareButton = document.getElementById("share-button");

  shareButton.addEventListener("click", function () {
    const uniqueId = "my_lists_id" + Math.random().toString(36).substr(2, 9);
    const currentUrl = window.location.href;
    const shareableLink = `${currentUrl}?id=${uniqueId}`;

    add_to_clipboard(shareableLink);
  });
}




function add_list_item() {
  const itemsContainer = document.getElementById("items");

  function toggleCompleted(event) {
    const itemNameElement = event.target.previousElementSibling;
    if (event.target.checked) itemNameElement.classList.add("completed");
    else itemNameElement.classList.remove("completed");

    const currList = document.getElementById("current-list-name").textContent;

    cache_list_changes(LocalData._shoppingLists.find((list) => list.name === currList));
  }

  function removeItem(event) {
    const res = confirm("Are you sure you want to delete this item?");
    if (!res) return;
    const itemDiv = event.target.parentElement;
    itemsContainer.removeChild(itemDiv);
    cache_item_changes();
  }

  const itemNameInput = document.getElementById(
    "item-name"
  );
  const itemQuantityInput = document.getElementById(
    "item-quantity"
  );

  const itemName = itemNameInput.value.trim();
  const itemQuantity = itemQuantityInput.value.trim();

  const currList = document.getElementById("current-list-name").textContent;
  const listObj = LocalData._shoppingLists.find((list) => list.name === currList);

  listObj.addProduct(itemName, itemQuantity);
  LocalData.cache_list_changes(listObj);

  if (itemName === "" || itemQuantity === "") {
    generate_notification("Please enter a name and quantity!", "bg-danger");
    return;
  }

  const itemDiv = document.createElement("div");
  itemDiv.className = "item";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.addEventListener("change", toggleCompleted);

  const itemNameElement = document.createElement("span");
  itemNameElement.textContent = `${itemName} \t (Qnt: ${itemQuantity})`;

  //const deleteButton = document.createElement("button");
  //deleteButton.className = "btn btn-danger delete-button";
  //deleteButton.textContent = "X";
  //deleteButton.addEventListener("click", removeItem);
//
  //itemDiv.appendChild(deleteButton);
  itemDiv.appendChild(itemNameElement);
  itemDiv.appendChild(checkbox);

  itemsContainer.appendChild(itemDiv);

  itemNameInput.value = "";
  itemQuantityInput.value = "";

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

  if (itemsContainer.children.length === 0) addNoItemMessage();
  else {
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


  const listNameInput = document.getElementById(
    "list-name"
  );
  const listName = listNameInput.value.trim();

  const newList = new ShoppingList();
  newList.name = listName;
  LocalData._shoppingLists.push(newList);
  console.log(LocalData._shoppingLists);
  LocalData.cache_changes();
  // clear the input
  listNameInput.value = "";

  if (listName === "") {
    generate_notification("Please enter a name!", "bg-danger");
    return;
  }

  const listContainer = document.getElementById("lists");

  const listDiv = document.createElement("div");
  listDiv.className = "list";

  const listNameElement = document.createElement("a");
  listNameElement.textContent = listName;
  listNameElement.className = "a-list-name";
  let listNameId = listName.replace(/\s/g, "*");
  const uniqueId =
    "id_" + listNameId + "_" + Math.random().toString(36).substr(2, 9);
  listNameElement.dataset.id = uniqueId;
  listNameElement.dataset.name = listName;

  listNameElement.addEventListener("click", () => {
    document.getElementById("current-list-name").textContent = uniqueId;
    document.getElementById("list-name-title").textContent = listName;
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
    const listDiv = (event.target).parentElement;
    listContainer.removeChild(listDiv);
    cache_list_changes();

    // clear the lists items
    const itemsContainer = document.getElementById("items");
    itemsContainer.innerHTML = "";
    cache_item_changes(true);
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

function login_modal() {


  // // add the username to the navbar
  const username = document.getElementById("username");
  // ask the user for the username
  if (LocalData._username == "") {
    username.value = prompt("Please enter your username");
    LocalData.cache_name(username.value);
  }
  
  username.textContent = LocalData._username;
}



add_go_back_listener();
add_list_popup();
add_item_popup();
update_item_count();
update_list_count();
add_share_link_listener();
login_modal();