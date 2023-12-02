#!/bin/sh


# Run replicas in the background
sh ./run_backend.sh 5 &
sh ./run_replicas.sh 5 &
sh ./run_proxy.sh 4000 1 &


sleep 10

# start random killing
sh ./kill_random_replicas.sh &



# Wait for background processes
wait
