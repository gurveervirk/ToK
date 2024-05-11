#!/bin/bash

cd client
npm install
cd ../server
pip install -r requirements.txt
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118