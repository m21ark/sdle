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
    cache_item_changes();
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
  ) as HTMLInputElement;
  const itemQuantityInput = document.getElementById(
    "item-quantity"
  ) as HTMLInputElement;

  const itemName = itemNameInput.value.trim();
  const itemQuantity = itemQuantityInput.value.trim();

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

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn btn-danger delete-button";
  deleteButton.textContent = "X";
  deleteButton.addEventListener("click", removeItem);

  itemDiv.appendChild(deleteButton);
  itemDiv.appendChild(itemNameElement);
  itemDiv.appendChild(checkbox);

  itemsContainer.appendChild(itemDiv);

  itemNameInput.value = "";
  itemQuantityInput.value = "";

  cache_item_changes();
}

function cache_item_changes() {
  const itemsContainer = document.getElementById("items");
  const currList = document.getElementById("current-list-name").textContent;
  if (currList === "") {
    alert("Please select a list first!");
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
  ) as HTMLInputElement;
  const listName = listNameInput.value.trim();

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
    load_previous_items();
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn btn-danger delete-button-list";
  deleteButton.textContent = "X";

  // add event listener to delete button
  deleteButton.addEventListener("click", function (event) {
    const res = confirm("Are you sure you want to delete this list?");
    if (!res) return;
    const listDiv = (event.target as HTMLElement).parentElement;
    listContainer.removeChild(listDiv);
    cache_list_changes();
  });

  listDiv.appendChild(deleteButton);
  listDiv.appendChild(listNameElement);

  listContainer.appendChild(listDiv);

  listNameInput.value = "";

  cache_list_changes();
}

function load_previous_items() {
  const itemsContainer = document.getElementById("items");
  const currList = document.getElementById("current-list-name").textContent;
  const cacheLocation = "myitems_" + currList;
  if (currList === "") return;

  const items = localStorage.getItem(cacheLocation);
  if (items) itemsContainer.innerHTML = items;
  else addNoItemMessage();

  const checkboxes = document.querySelectorAll(".item input[type=checkbox]");

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", function (event) {
      const itemNameElement = (event.target as HTMLInputElement)
        .previousElementSibling;
      if ((event.target as HTMLInputElement).checked)
        itemNameElement.classList.add("completed");
      else itemNameElement.classList.remove("completed");
      cache_item_changes();
    });
  });

  const deleteButtons = document.querySelectorAll(".delete-button");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      const res = confirm("Are you sure you want to delete this item?");
      if (!res) return;
      const itemDiv = (event.target as HTMLElement).parentElement;
      itemsContainer.removeChild(itemDiv);
      cache_item_changes();
    });
  });

  // if name is crossed out, check the checkbox
  const itemNames = document.querySelectorAll(".item span");
  itemNames.forEach((itemName) => {
    if (itemName.classList.contains("completed")) {
      const checkbox = itemName.nextElementSibling as HTMLInputElement;
      checkbox.checked = true;
    }
  });
}

function toggle_view() {
  const div1 = document.getElementById("appList");
  const div2 = document.getElementById("appListing");

  const btn1 = document.getElementById("floating-add-button");
  const btn2 = document.getElementById("floating-add-button-list");

  const burger = document.getElementById("burger-icon");

  if (div1.style.display === "none") {
    // enter item list view
    div1.style.display = "block";
    div2.style.display = "none";
    btn2.style.display = "none";
    btn1.style.display = "block";
    burger.style.display = "block";
  } else {
    // enter lists view
    div1.style.display = "none";
    div2.style.display = "block";
    btn1.style.display = "none";
    btn2.style.display = "block";
    burger.style.display = "none";
    document.getElementById("current-list-name").textContent = "";
  }
}

function load_previous_lists() {
  const list_container = document.getElementById("lists");
  const lists = localStorage.getItem("lists");
  if (lists) list_container.innerHTML = lists;
  else {
    addNoListMessage();
    return;
  }

  const list_href = document.querySelectorAll(
    ".a-list-name"
  ) as NodeListOf<HTMLElement>;
  for (let i = 0; i < list_href.length; i++)
    list_href[i].addEventListener("click", () => {
      document.getElementById("current-list-name").textContent =
        list_href[i].dataset.id;
      document.getElementById("list-name-title").textContent =
        list_href[i].dataset.name;
      toggle_view();
      load_previous_items();
    });

  const deleteButtons = document.querySelectorAll(".delete-button-list");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      const res = confirm("Are you sure you want to delete this list?");
      if (!res) return;
      const listDiv = (event.target as HTMLElement).parentElement;
      list_container.removeChild(listDiv);
      cache_list_changes();
    });
  });
}

function addNoListMessage() {
  const error = document.getElementById("lists-list");
  const errorP = document.createElement("p");
  errorP.textContent = "No lists found";
  errorP.className = "no_list_found";
  //  error.appendChild(errorP); // anoying bug
}

function addNoItemMessage() {
  const error = document.getElementById("todo-list");
  const errorP = document.createElement("p");
  errorP.textContent = "No items found";
  errorP.className = "no_list_found";
  // error.appendChild(errorP);  // anoying bug
}

function add_go_back_listener() {
  const burger = document.getElementById("burger-icon");
  burger.addEventListener("click", toggle_view);
}

add_go_back_listener();
add_list_popup();
load_previous_lists();
add_item_popup();
update_item_count();
update_list_count();
add_share_link_listener();
