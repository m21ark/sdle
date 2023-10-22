import { ShoppingList } from "../logic/shopping_list.js";

export var _shoppingLists = []; // TODO: should be a map of list names to list
export var _username = "";

// let shoppingList = new ShoppingList();
// shoppingList.name = "Big list";
// shoppingList.addProduct("Banana", 10);
// shoppingList.addProduct("Apple", 5);
// 
// localStorage.setItem("shoppingLists", JSON.stringify([shoppingList.name]));
// localStorage.setItem(shoppingList.name, JSON.stringify(shoppingList));

function load_previous_lists() {
    let lists = JSON.parse(localStorage.getItem("shoppingLists"));

    if (lists) {
        lists.forEach(list => {
            let s = new ShoppingList();
            s.name = list;
            s.fromJSON(localStorage.getItem(list));
            _shoppingLists.push(s);
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
    localStorage.setItem("shoppingLists", JSON.stringify(_shoppingLists.map(list => list.name)));
    localStorage.setItem(list.name, JSON.stringify(list));
    console.log(localStorage.getItem(list.name));
}

export function cache_changes() {
    localStorage.setItem("shoppingLists", JSON.stringify(_shoppingLists.map(list => list.name)));

    _shoppingLists.forEach(list => {
        localStorage.setItem(list.name, JSON.stringify(list));
    });
}

function fetch_commits(list) {

    const lastCommit = list.lastCommit || 0;
    const url = `http://localhost:5000/commits/${list.name}/${lastCommit}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                // update the list with the new commits
                //list.updateFromCommits(data);
                //// update the lastCommit checkpoint
                //list.lastCommit = data[data.length - 1].id;
                //// cache the changes
                //cache_list_changes(list);
                console.log(data);
            }
        })
        .catch(error => console.error(`Error fetching commits for ${list.name}: ${error}`));

    return;
}

export var online = false;

function toggleOnline() {
    online = !online;
    if (online) {
        document.getElementById("online-status").textContent = "Online";
        document.getElementById("online-status").style.color = "green";
    } else {
        document.getElementById("online-status").textContent = "Offline";
        document.getElementById("online-status").style.color = "red";
    }
}

// set a timeout that call the sync function every 5 seconds
setInterval(() => {
    if (online) {
        _shoppingLists.forEach(list => {
            fetch_commits(list);
        });

    }
}, 5000);



load_previous_lists();
load_name();


