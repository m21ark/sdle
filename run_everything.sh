#!/bin/sh


# Function to restart a replica
restart_replica() {
    local replica_number=$1
    local port=$((5000 + replica_number))
    echo "Restarting replica $replica_number on port $port"

    # Add your command to restart the replica here
    npx nodemon ./db/index.js $port 2>&1 &
}


# Run replicas in the background
sh ./backend/run_backend.sh 5 &
sh ./db/run_replicas.sh 5 &
sh ./connection/run_proxy.sh 4000 1 &


sleep 10

# Run indefinitely
# while true; do
#     # Generate a random number between 1 and 5
#     random_replica=$(shuf -i 0-4 -n 1)
#     echo "Stopping a random replica: $random_replica"

#     port_number=$((random_replica + 5000))

#     # Find the process ID (PID) using the specified port
#     pid=$(lsof -t -i :$port_number)
    
#     # Check if a process was found
#     if [ -n "$pid" ]; then
#         # Kill the process
#         kill $pid
#         echo "Process on port $port_number killed successfully."
#     else
#         echo "No process found on port $port_number."
#     fi

#     # Wait for some time (e.g., 10 seconds) before restarting the replica
#     sleep 10

#     # Restart the stopped replica
#     restart_replica $random_replica

#     sleep 10
# done



# Wait for background processes
wait
