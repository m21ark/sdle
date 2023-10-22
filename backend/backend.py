from flask import Flask, request, jsonify
from aux_db_functions import *
from flask_cors import CORS

app = Flask(__name__)
CORS( app )


# ========== MAIN ROUTES ==========


@app.route('/list/<string:list_name>/<string:commit>', methods=['POST'])
def add_commit_to_list(list_name, commit):
    data = request.get_json()
    if 'data' in data:
        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO commitChanges (user_name, list_name, commit_hash, commit_data) VALUES (?, ?, ?, ?)',
                       (data['username'], list_name, commit, data['data']))
        conn.commit()
        conn.close()
        return 'Commit added successfully', 201
    else:
        return 'Invalid commit data', 400

        


@app.route('/commits/<string:list_name>/<string:commit_hash>', methods=['GET'])
def get_commits_after(list_name, commit_hash):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute('SELECT commit_hash, commit_data FROM commitChanges WHERE list_name = ? \
                   AND id > (SELECT id FROM commitChanges WHERE commit_hash = ?) and commit_hash <> ?', 
                   (list_name, commit_hash, commit_hash))
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for row in rows:
        result.append({
            'commit_hash': row[0], # 'commit_hash': 'commit_hash',
            'commit_data': row[1]})
    
    return jsonify(result)
   






# ===================================================== USER ROUTES =====================================================


@app.route('/users', methods=['GET'])
def get_users():
    return jsonify(fetch_all('users'))


@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = fetch_by_id('users', user_id)
    return jsonify(user) if user else ('User not found', 404)


@app.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.get_json()
    update_by_id('users', user_id, data)
    return 'User updated successfully'


@app.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    delete_by_id('users', user_id)
    return 'User deleted successfully'


@app.route('/users', methods=['POST'])
def add_user():
    data = request.get_json()
    if 'email' in data and 'password' in data:
        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (email, password) VALUES (?, ?)',
                       (data['email'], data['password']))
        conn.commit()
        conn.close()
        return 'User added successfully', 201
    else:
        return 'Invalid user data', 400

# ===================================================== LISTS ROUTES =====================================================


@app.route('/lists', methods=['GET'])
def get_lists():
    return jsonify(fetch_all('todo_lists'))


@app.route('/lists/<int:list_id>', methods=['GET'])
def get_list(list_id):
    list = fetch_by_id('todo_lists', list_id)
    return jsonify(list) if list else ('List not found', 404)


@app.route('/lists/<int:list_id>', methods=['PUT'])
def update_list(list_id):
    data = request.get_json()
    update_by_id('todo_lists', list_id, data)
    return 'List updated successfully'


@app.route('/lists/<int:list_id>', methods=['DELETE'])
def delete_list(list_id):
    delete_by_id('todo_lists', list_id)
    return 'List deleted successfully'


@app.route('/lists', methods=['POST'])
def add_list():
    data = request.get_json()
    if 'name' in data:
        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO todo_lists (name) VALUES (?)',
                       (data['name'],))
        conn.commit()
        conn.close()
        return 'List added successfully', 201
    else:
        return 'Invalid list data', 400


# ===================================================== ITEMS ROUTES =====================================================

@app.route('/list_items/<int:todo_list_id>', methods=['GET'])
def get_list_items(todo_list_id):
    list_items = fetch_all_list_items(todo_list_id)
    return jsonify(list_items) if list_items else ('List items not found', 404)


@app.route('/list_items/<int:todo_list_id>', methods=['POST'])
def add_list_item(todo_list_id):
    data = request.get_json()
    insert_list_item(todo_list_id, data)
    return 'List item added successfully', 201


@app.route('/list_items/<int:todo_list_id>/<int:item_id>', methods=['PUT'])
def update_list_item(todo_list_id, item_id):
    data = request.get_json()
    update_list_item_by_id(todo_list_id, item_id, data)
    return 'List item updated successfully'


@app.route('/list_items/<int:todo_list_id>/<int:item_id>', methods=['DELETE'])
def delete_list_item(todo_list_id, item_id):
    delete_list_item_by_id(todo_list_id, item_id)
    return 'List item deleted successfully'


# ================================================= SHARED LISTS ROUTES ==================================================

@app.route('/shared_lists/<int:todo_list_id>', methods=['POST'])
def share_list(todo_list_id):
    data = request.get_json()
    share_list_with_users(todo_list_id, data)
    return 'List shared successfully', 201


@app.route('/shared_lists/user/<int:user_id>', methods=['GET'])
def get_shared_lists_for_user(user_id):
    shared_lists = fetch_shared_lists_for_user(user_id)
    return jsonify(shared_lists)


# ===================================================== MAIN =====================================================

if __name__ == '__main__':
    app.run(debug=True)
