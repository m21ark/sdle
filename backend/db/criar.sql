-- Drop tables if they exist
DROP TABLE IF EXISTS shared_lists;
DROP TABLE IF EXISTS list_items;
DROP TABLE IF EXISTS todo_lists;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS list;
DROP TABLE IF EXISTS commitChanges;

-- Create the 'users' table to store user information
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);

CREATE TABLE list (
    name TEXT PRIMARY KEY
);

INSERT INTO list (name) VALUES ('fruits');

CREATE TABLE commitChanges (
    id INTEGER PRIMARY KEY,
    user_name TEXT NOT NULL,
    list_name INTEGER NOT NULL,
    commit_hash TEXT NOT NULL,
    commit_data TEXT NOT NULL,
    FOREIGN KEY (list_name) REFERENCES list(name) ON DELETE CASCADE
);

-- ====================================================================================================


-- Create the 'todo_lists' table to store the user's to-do lists
CREATE TABLE todo_lists (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    internal_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create the 'list_items' table to store individual items in a to-do list
CREATE TABLE list_items (
    id INTEGER PRIMARY KEY,
    todo_list_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    quantity_left INTEGER NOT NULL,
    crossed BOOLEAN NOT NULL,
    FOREIGN KEY (todo_list_id) REFERENCES todo_lists(id) ON DELETE CASCADE
);

-- Create the 'shared_lists' table to store shared to-do lists between users
CREATE TABLE shared_lists (
    id INTEGER PRIMARY KEY,
    shared_by_user_id INTEGER NOT NULL,
    shared_with_user_id INTEGER NOT NULL,
    todo_list_id INTEGER NOT NULL,
    FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id),
    FOREIGN KEY (todo_list_id) REFERENCES todo_lists(id) ON DELETE CASCADE
);
