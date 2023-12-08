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

/*
INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES ('user1', 'list1', '109ABC', '{delta: {"potato": 1}}');
INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES ('user2', 'list1', '109DEF', '{delta: {"carrot": 2}}');
INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES ('user2', 'list1', '109GHI', '{delta: {"tomato": 3}}');
INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES ('user2', 'list2', '103JKL', '{delta: {"onion": 4}}');
INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES ('user2', 'list2', '102MNO', '{delta: {"pepper": 5}}');
INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES ('user3', 'list3', '107PQR', '{delta: {"cucumber": 6}}');
INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES ('user3', 'list3', '102STU', '{delta: {"lettuce": 7}}');
INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES ('user3', 'list3', '101VWX', '{delta: {"broccoli": 8}}');
INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES ('user3', 'list3', '108YZA', '{delta: {"spinach": 9}}');
INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES ('user3', 'list3', '105BCD', '{delta: {"spinach": 3}}');
*/
