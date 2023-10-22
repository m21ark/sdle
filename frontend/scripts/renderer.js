import * as LocalData from './local_data_operations.js'


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


function list_rendering(list) { // TODO: add the list id
    return `<div class="list">\
    <button class="btn btn-danger delete-button-list">X</button> \
    <a class="a-list-name" data-id="id_a*tua*mae_l41to3wgl" data-name="${list.name}">${list.name}</a></div>`;
}

function render_lists() {
    let lists = LocalData._shoppingLists;

    const list_container = document.getElementById("lists");

    lists = lists.map(list_rendering).join("");

    if (lists) list_container.innerHTML = lists;
    else {
        addNoListMessage();
        return;
    }

    const list_href = document.querySelectorAll(
        ".a-list-name"
    );
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
            const listDiv = (event.target).parentElement;
            list_container.removeChild(listDiv);
            cache_list_changes();

            // clear the lists items
            const itemsContainer = document.getElementById("items");
            itemsContainer.innerHTML = "";
            cache_item_changes(true);
        });
    });
}

function render_list_items(list) {
    
}





render_lists();
console.log("renderer.js loaded");