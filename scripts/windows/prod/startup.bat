@echo off

start cmd /k "cd client && serve -s build"
start cmd /k "cd server && python server.py"
