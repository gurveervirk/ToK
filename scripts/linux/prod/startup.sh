#!/bin/bash

# Start frontend server in the background
cd client
serve -s build &

# Start backend server in the background
cd ../server
python server.py
