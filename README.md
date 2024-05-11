# Trove Of Knowledge

This project aims to use AI models and indices to query documents and retrieve better-informed responses from the models. It allows you to upload your documents that will be used to answer any corresponding queries.

## Getting Started

If you are using a Linux-based OS, you would have to give permissions to the shell scripts using: ```chmod +x *.sh```

1. Run ```scripts\windows\dev\setup.bat``` in your Windows terminal or ```scripts\linux\dev\setup.bat``` in your linux terminal. This needs to be done only once.
2. Run ```scripts\windows\dev\startup.bat``` in your Windows terminal or ```scripts\linux\dev\startup.sh``` in your linux terminal

To run a production build of the react app (*make sure the previous steps have been executed before the following ones are*):

1. Run ```scripts\windows\prod\setup.bat``` in your Windows terminal or ```scripts\linux\prod\setup.bat``` in your linux terminal. This needs to be done only once.
2. Run ```scripts\windows\prod\startup.bat``` in your Windows terminal or ```scripts\linux\prod\startup.bat``` in your linux terminal. This needs to be done only once.

Access the application at http://localhost:3000/

## Setup

You will asked to fill the required settings. This can be done by clicking the Settings button in the left panel that will require you to fill in:
- Your **HuggingFace** read token
- Your **Neo4j** database settings (can be provided in the input areas or as a file received from Neo4j)

If you do not already have a Neo4j account, kindly create one (it's free!). 

These will be stored locally in your system in the server folder of this project as **settings.json**. All your sessions will be stored in the **prev_msgs** folder in the server folder, as json files.

## Usage

You can prompt the model without any context by leaving the checkbox to the left of the input area unchecked, or use the index by checking the same.

You can also upload text documents using the button on the top right hand corner, that will be embed and stored in your Neo4j database.