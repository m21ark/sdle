import sqlite3


def connect_db():
    conn = sqlite3.connect('./db/database.db')
    conn.row_factory = sqlite3.Row
    return conn


def fetch_all(table_name):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(f'SELECT * FROM {table_name}')
    data = cursor.fetchall()
    conn.close()
    return [dict(row) for row in data]


def fetch_by_id(table_name, row_id):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(f'SELECT * FROM {table_name} WHERE id = ?', (row_id,))
    data = cursor.fetchone()
    conn.close()
    return dict(data) if data else None


def update_by_id(table_name, row_id, data):
    conn = connect_db()
    cursor = conn.cursor()
    update_query = f'UPDATE {table_name} SET ' + \
        ', '.join([f'{key} = ?' for key in data.keys()])
    cursor.execute(update_query, tuple(data.values()) + (row_id,))
    conn.commit()
    conn.close()


def delete_by_id(table_name, row_id):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(f'DELETE FROM {table_name} WHERE id = ?', (row_id,))
    conn.commit()
    conn.close()


def fetch_all_list_items(todo_list_id):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT * FROM list_items WHERE todo_list_id = ?', (todo_list_id,))
    data = cursor.fetchall()
    conn.close()
    return [dict(row) for row in data]


def insert_list_item(todo_list_id, data):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO list_items (todo_list_id, name, quantity, quantity_left, crossed) VALUES (?, ?, ?, ?, ?)',
                   (todo_list_id, data['name'], data['quantity'], data['quantity_left'], data['crossed']))
    conn.commit()
    conn.close()


def update_list_item_by_id(todo_list_id, item_id, data):
    conn = connect_db()
    cursor = conn.cursor()
    update_query = 'UPDATE list_items SET ' + \
        ', '.join([f'{key} = ?' for key in data.keys()])
    cursor.execute(update_query, tuple(data.values()) + (item_id,))
    conn.commit()
    conn.close()


def delete_list_item_by_id(todo_list_id, item_id):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(
        'DELETE FROM list_items WHERE todo_list_id = ? AND id = ?', (todo_list_id, item_id))
    conn.commit()
    conn.close()


def fetch_shared_lists(todo_list_id):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT * FROM shared_lists WHERE todo_list_id = ?', (todo_list_id,))
    data = cursor.fetchall()
    conn.close()
    return [dict(row) for row in data]


def share_list_with_users(todo_list_id, data):
    conn = connect_db()
    cursor = conn.cursor()
    for user_id in data['user_ids']:
        cursor.execute('INSERT INTO shared_lists (shared_by_user_id, shared_with_user_id, todo_list_id) VALUES (?, ?, ?)',
                       (data['shared_by_user_id'], user_id, todo_list_id))
    conn.commit()
    conn.close()


def fetch_shared_lists_for_user(user_id):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT * FROM shared_lists WHERE shared_with_user_id = ?', (user_id,))
    data = cursor.fetchall()
    conn.close()
    return [dict(row) for row in data]
