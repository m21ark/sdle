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
    const uniqueId = "id-" + Math.random().toString(36).substr(2, 9);
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
    update_local_storage();
  }

  function removeItem(event) {
    const res = confirm("Are you sure you want to delete this item?");
    if (!res) return;
    const itemDiv = event.target.parentElement;
    itemsContainer.removeChild(itemDiv);
    update_local_storage();
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
  itemNameElement.textContent = `${itemName} \t|\t (Qnt: ${itemQuantity})`;

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

  update_local_storage();
}

function update_local_storage() {
  const itemsContainer = document.getElementById("items");
  localStorage.setItem("items", itemsContainer.innerHTML);

  update_list_count();
}

function update_list_count() {
  const itemsContainer = document.getElementById("items");
  const count = document.querySelector("#list-item-count");
  count.textContent = `(${itemsContainer.children.length})`;
}

function add_side_nav_toggle() {
  const menuContainer = document.getElementById("menu-container");
  const burgerIcon = document.getElementById("burger-icon");

  burgerIcon.addEventListener("click", function () {
    if (menuContainer.style.left === "0px") menuContainer.style.left = "-250px";
    else menuContainer.style.left = "0px";
  });
}

function add_item_popup() {
  const showPopupButton = document.getElementById("floating-add-button");
  const popup = document.getElementById("popup");
  const overlay = document.getElementById("overlay");
  const closePopupButton = document.getElementById("close-popup");
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

function load_previous_items() {
  const itemsContainer = document.getElementById("items");
  const items = localStorage.getItem("items");
  if (items) itemsContainer.innerHTML = items;

  const checkboxes = document.querySelectorAll(".item input[type=checkbox]");

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", function (event) {
      const itemNameElement = (event.target as HTMLInputElement)
        .previousElementSibling;
      if ((event.target as HTMLInputElement).checked)
        itemNameElement.classList.add("completed");
      else itemNameElement.classList.remove("completed");
      update_local_storage();
    });
  });

  const deleteButtons = document.querySelectorAll(".delete-button");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      const res = confirm("Are you sure you want to delete this item?");
      if (!res) return;
      const itemDiv = (event.target as HTMLElement).parentElement;
      itemsContainer.removeChild(itemDiv);
      update_local_storage();
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

load_previous_items();
add_item_popup();
update_list_count();
add_share_link_listener();
add_side_nav_toggle();
