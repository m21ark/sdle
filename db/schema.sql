-- Drop tables if they exist
DROP TABLE IF EXISTS commitChanges;
DROP TABLE IF EXISTS userLists;

CREATE TABLE userLists (
    id INTEGER PRIMARY KEY,
    user_name TEXT NOT NULL,
    list_name TEXT NOT NULL,
    UNIQUE (user_name, list_name)
);

CREATE TABLE commitChanges (
    id INTEGER PRIMARY KEY,
    user_name TEXT NOT NULL,
    list_name TEXT NOT NULL,
    commit_hash TEXT NOT NULL,
    commit_data TEXT NOT NULL--,
    --FOREIGN KEY (list_name) REFERENCES todo_lists(name) ON DELETE CASCADE
);


