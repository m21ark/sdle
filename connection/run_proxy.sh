#!/bin/sh

if [ "$#" -ne 2 ]; then
  echo "Usage: <base_port> <number_of_instances>"
  exit 1
fi

base_port=$1
num_instances=$2



echo "Starting $num_instances instances of proxy on ports $base_port to $((base_port + num_instances - 1))"

i=0
while [ "$i" -lt "$num_instances" ]; do
  port=$((base_port + i))

  npx nodemon ./proxy.js $port 2>&1 &

  i=$((i + 1))
done

echo "Starting DNS server"
npx nodemon ./dns.js 2>&1 &

# Wait for all background processes to finish
wait
