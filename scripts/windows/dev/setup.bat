@echo off

cd client
npm install
cd ..
cd server
pip install -r requirements.txt
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118