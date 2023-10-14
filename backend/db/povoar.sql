-- Insert mock data into the 'users' table
INSERT INTO users (email, password) VALUES
    ('user1@example.com', 'password123'),
    ('user2@example.com', 'securepass'),
    ('user3@example.com', '12345password');

-- Insert mock data into the 'todo_lists' table
INSERT INTO todo_lists (user_id, name, internal_id) VALUES
    (1, 'Grocery List', 'grocery-1'),
    (1, 'Work Tasks', 'work-1'),
    (2, 'Personal Goals', 'personal-1');

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

