#!/bin/bash

# Start frontend server in the background
cd client
npm start &

# Start backend server in the background
cd ../server
python server.py
