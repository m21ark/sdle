-- Drop tables if they exist
DROP TABLE IF EXISTS commitChanges;

CREATE TABLE commitChanges (
    id INTEGER PRIMARY KEY,
    user_name TEXT NOT NULL,
    list_name TEXT NOT NULL,
    commit_hash TEXT NOT NULL,
    commit_data TEXT NOT NULL--,
    --FOREIGN KEY (list_name) REFERENCES todo_lists(name) ON DELETE CASCADE
);

