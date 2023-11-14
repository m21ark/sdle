#!/bin/sh

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <number_of_instances>"
  exit 1
fi

num_instances=$1
base_port=5000

i=0
while [ "$i" -lt "$num_instances" ]; do
  port=$((base_port + i))
  db_file="./backend/db/database_${port}.db"

  # Create the SQLite database using schema.sql
  sqlite3 $db_file < ./backend/schema.sql

  # Start your Node.js application with the generated database file
  npx nodemon ./backend/index.js $port 2>&1 &
  
  i=$((i + 1))
done

# Wait for all background processes to finish
wait