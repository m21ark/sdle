const express = require('express');
const sqlite3 = require('sqlite3');

const app = express();
const port = process.env.PORT || 3000;

// Create a SQLite database (in-memory for this example)
const db = new sqlite3.Database(':memory:');

// Create a basic table and add some data
db.serialize(() => {
  db.run('CREATE TABLE messages (message TEXT)');

  const stmt = db.prepare('INSERT INTO messages VALUES (?)');
  stmt.run('Hello from SQLite!');
  stmt.finalize();
});

app.get('/messages', (req, res) => {
  db.all('SELECT message FROM messages', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

