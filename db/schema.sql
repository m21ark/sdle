-- Drop tables if they exist
DROP TABLE IF EXISTS shared_lists;
DROP TABLE IF EXISTS list_items;
DROP TABLE IF EXISTS todo_lists;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS commitChanges;

-- Create the 'users' table to store user information
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);


-- Create the 'todo_lists' table to store the user's to-do lists
CREATE TABLE todo_lists (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    internal_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



CREATE TABLE commitChanges (
    id INTEGER PRIMARY KEY,
    user_name TEXT NOT NULL,
    list_name TEXT NOT NULL,
    commit_hash TEXT NOT NULL,
    commit_data TEXT NOT NULL--,
    --FOREIGN KEY (list_name) REFERENCES todo_lists(name) ON DELETE CASCADE
);

-- ====================================================================================================



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


-- ===============================================================================

-- Insert mock data into the 'users' table
INSERT INTO users (email, password) VALUES
    ('user1@example.com', 'password123'),
    ('user2@example.com', 'securepass'),
    ('user3@example.com', '12345password');

-- Insert mock data into the 'todo_lists' table
INSERT INTO todo_lists (user_id, name, internal_id) VALUES
    (1, 'Grocery List', 'grocery-1'),
    (1, 'Work Tasks', 'work-1'),
    (2, 'Personal Goals', 'personal-1'),
    (3, 'MAA', 'temp-1');

-- Insert mock data into the 'list_items' table
INSERT INTO list_items (todo_list_id, name, quantity, quantity_left, crossed) VALUES
    (1, 'Milk', 1, 1, 0),
    (1, 'Bread', 2, 2, 1),
    (2, 'Project A', 1, 0, 0),
    (2, 'Project B', 1, 1, 0),
    (3, 'Exercise', 5, 5, 1);

-- Insert mock data into the 'shared_lists' table
INSERT INTO shared_lists (shared_by_user_id, shared_with_user_id, todo_list_id) VALUES
    (1, 2, 1),
    (1, 3, 2);

