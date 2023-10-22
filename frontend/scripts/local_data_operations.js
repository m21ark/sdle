import { ShoppingList } from "../logic/shopping_list.js";

export var _shoppingLists = []; // TODO: should be a map of list names to list

// let shoppingList = new ShoppingList();
// shoppingList.name = "Big list";
// shoppingList.addProduct("Banana", 10);
// shoppingList.addProduct("Apple", 5);
// 
// localStorage.setItem("shoppingLists", JSON.stringify([shoppingList]));


function load_previous_lists() {
    let lists = JSON.parse(localStorage.getItem("shoppingLists"));

    if (lists) {
        lists.forEach(list => {
            _shoppingLists.push(list);
        });
    }
}



load_previous_lists();
