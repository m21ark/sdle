#!/bin/sh


# Function to restart a replica
restart_replica() {
    local replica_number=$1
    local port=$((5000 + replica_number))
    echo "Restarting replica $replica_number on port $port"

    # Add your command to restart the replica here
    cd ./db/
    npx nodemon ./index.js $port 2>&1 &
    cd ..
}


# Run replicas in the background

cd ./backend/
sh ./run_backend.sh 5 &
cd ../db/
sh ./run_replicas.sh 5 &
cd ../connection/
sh ./run_proxy.sh 4000 3 &
cd ../control_panel/
node ./kill_proccess_backend.js 2>&1 &
cd ..
npx live-server frontend/ --port=9000 2>&1 &
npx live-server control_panel/ --port=9001 2>&1 &
npx pm2 logs 2>&1 &

wait

