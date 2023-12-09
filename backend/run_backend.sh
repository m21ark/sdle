#!/bin/sh

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <number_of_instances>"
  exit 1
fi

num_instances=$1
base_port=5500

i=0
while [ "$i" -lt "$num_instances" ]; do
  port=$((base_port + i))

  # npx nodemon ./index.js $port 2>&1 &
  npx pm2 start --name "$port" index.js -- $port &

  i=$((i + 1))
done

npx nodemon ./hinted_handoff.js 2>&1 &

# Wait for all background processes to finish
wait
