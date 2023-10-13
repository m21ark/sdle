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

function add_share_link_listener() {
  // Generate a unique ID (you can use a more sophisticated method if needed)
  function generateUniqueId() {
    return "id-" + Math.random().toString(36).substr(2, 9);
  }

  // Get the share button and share link elements
  const shareButton = document.getElementById("share-button");

  // Add a click event listener to the share button
  shareButton.addEventListener("click", function () {
    const uniqueId = generateUniqueId(); // Generate a unique ID
    const currentUrl = window.location.href; // Get the current URL

    // Create a shareable link by appending the unique ID to the current URL
    const shareableLink = `${currentUrl}?id=${uniqueId}`;

    add_to_clipboard(shareableLink);
  });
}

function add_list_item() {
  const itemsContainer = document.getElementById("items");

  function toggleCompleted(event) {
    const itemNameElement = event.target.previousElementSibling;
    if (event.target.checked) {
      itemNameElement.classList.add("completed");
    } else {
      itemNameElement.classList.remove("completed");
    }
  }

  function removeItem(event) {
    const res = confirm("Are you sure you want to delete this item?");
    if (!res) return;
    const itemDiv = event.target.parentElement;
    itemsContainer.removeChild(itemDiv);
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
  itemNameElement.textContent = `${itemName} (Qnt: ${itemQuantity})`;

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
  console.log("here");
}

function add_side_nav_toggle() {
  // Get the menu container and burger icon elements
  const menuContainer = document.getElementById("menu-container");
  const burgerIcon = document.getElementById("burger-icon");

  // Toggle the menu when the burger icon is clicked
  burgerIcon.addEventListener("click", function () {
    if (menuContainer.style.left === "0px") {
      menuContainer.style.left = "-250px"; // Hide the menu
    } else {
      menuContainer.style.left = "0px"; // Show the menu
    }
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

add_item_popup();
add_share_link_listener();
add_side_nav_toggle();
