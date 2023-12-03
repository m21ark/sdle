import * as LocalData from "./local_data_operations.js";


function addNoItemMessage() {
  const error = document.getElementById("todo-list");
  const errorP = document.createElement("p");
  errorP.textContent = "No items found";
  errorP.className = "no_list_found";
  error.appendChild(errorP);
}

function addNoListMessage() {
  const error = document.getElementById("lists-list");
  const errorP = document.createElement("p");
  errorP.textContent = "No lists found";
  errorP.className = "no_list_found";
  error.appendChild(errorP);
}

export function toggle_view() {
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

    // empty items container when switching to lists view to avoid confusion
    const itemsContainer = document.getElementById("items");
    itemsContainer.innerHTML = "";
  }
}

function list_rendering(list) {
  // TODO: add the list id
  return `<div class="list">\
    <button class="btn btn-danger delete-button-list">X</button> \
    <a class="a-list-name" data-id="${list.name}" data-name="${list.name}">${list.name}</a></div>`;
}

function render_lists() {
  let lists = [...LocalData._shoppingLists.values()];

  const list_container = document.getElementById("lists");

  lists = lists.map(list_rendering).join("");

  if (lists) list_container.innerHTML = lists;
  else {
    addNoListMessage();
    return;
  }

  const list_href = document.querySelectorAll(".a-list-name");
  for (let i = 0; i < list_href.length; i++)
    list_href[i].addEventListener("click", () => {
      document.getElementById("current-list-name").textContent =
        list_href[i].dataset.id;
      document.getElementById("list-name-title").textContent =
        list_href[i].dataset.name;

      toggle_view();
      render_list_items();
    });

  const deleteButtons = document.querySelectorAll(".delete-button-list");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      const res = confirm("Are you sure you want to delete this list?");
      if (!res) return;
      const listDiv = event.target.parentElement;
      list_container.removeChild(listDiv);

      // clear the lists items
      const itemsContainer = document.getElementById("items");
      itemsContainer.innerHTML = "";

      LocalData.remove_list(listDiv.lastChild.textContent);
    });
  });
}

export function list_item_rendering(id, item) {
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

export function render_list_items() {
  const itemsContainer = document.getElementById("items");
  const currList = document.getElementById("current-list-name").textContent;

  if (currList === "") return;

  let items = null;

  let itemsHtml = "";

  console.log("Current list: ", currList);

  if (LocalData._shoppingLists.has(currList)) {
    items = LocalData._shoppingLists.get(currList);
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

      if (LocalData._shoppingLists.has(currList)) {
        const listObj = LocalData._shoppingLists.get(currList);
        listObj.removeFromList(itemNameElement.textContent);
        LocalData.cache_list_changes(listObj);
      } else console.warn("List does not exist");
    });
  });

  const plusButtons = document.querySelectorAll(".quantity__plus");
  plusButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      const itemNameElement =
        event.target.parentElement.parentElement.children[0];

      const currList = document.getElementById("current-list-name").textContent;

      if (LocalData._shoppingLists.has(currList)) {
        const listObj = LocalData._shoppingLists.get(currList);
        listObj.addProduct(itemNameElement.textContent, 1);
        LocalData.cache_list_changes(listObj);
        render_list_items();
      } else console.warn("List does not exist");
    });
  });

  const minusButtons = document.querySelectorAll(".quantity__minus");
  minusButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      const itemNameElement =
        event.target.parentElement.parentElement.children[0];

      const currList = document.getElementById("current-list-name").textContent;

      if (LocalData._shoppingLists.has(currList)) {
        const listObj = LocalData._shoppingLists.get(currList);
        // check if item value is bigger than 0
        if (listObj.getQuantityToBuy(itemNameElement.textContent) > 0) {
          listObj.removeProduct(itemNameElement.textContent, 1);
          LocalData.cache_list_changes(listObj);
          render_list_items();
        }
      } else console.warn("List does not exist");
    });
  });

  // const deleteButtons = document.querySelectorAll(".delete-button");
  // deleteButtons.forEach((button) => {
  //     button.addEventListener("click", function (event) {
  //         const res = confirm("Are you sure you want to delete this item?");
  //         if (!res) return;
  //         const itemDiv = (event.target).parentElement;
  //         itemsContainer.removeChild(itemDiv);
  //         cache_item_changes();
  //     });
  // });

  // if name is crossed out, check the checkbox
  const itemNames = document.querySelectorAll(".item span");
  itemNames.forEach((itemName) => {
    if (itemName.classList.contains("completed")) {
      const checkbox = itemName.nextElementSibling;
      checkbox.checked = true;
    }
  });

  //update_item_count();
}

render_lists();
