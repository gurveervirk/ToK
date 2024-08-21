# Trove Of Knowledge

<div align="center">
  <img height="400" width="400" alt="gurveervirk/ToK" src="https://github.com/gurveervirk/ToK/blob/main/app/public/tok.jpg">
</div>

This project is a *fully local*, *high quality*, *ChatGPT-esque*, *extensible RAG application*, that makes use of AI models and indices to query documents and retrieve better-informed responses from the models. It allows you to upload your documents that can be used to answer any corresponding queries. It automatically stores your chats for future usage.

## Prerequisites

This app has two dependencies that need to be installed separately:
- [Neo4j Desktop](https://neo4j.com/download/) for best-in-class vector and graph stores
- [Ollama](https://ollama.com/download) for quick and easy model download, serving as well as automatic and smart device loading

Once both are installed and setup using their installers, set the **neo4j bin path** in **PATH** in environmental variables, so that it can be accessed by our app. 

bin path ex: installation\path\.Neo4jDesktop\relate-data\dbmss\your-current-dbms\bin

Run ```neo4j windows-service install``` in command prompt/powershell to activate neo4j cli.

## Getting Started

1) Go to the Releases page, and download the latest ToKInstaller.exe. 
2) Run it and follow the steps to complete the installation.
3) Go to the installation directory (default: "C:\Program Files (x86)\ToK"), and make the following changes to settings.json:
    - *username* to your working database name
    - *password* to your newly set password in neo4j project
    - *uri* to your neo4j project's uri

p.s username and uri should remain the same as they are the default values in neo4j.

**Done!**

## Usage

Start the app from desktop or start menu after completing the above tasks.

The app allows the user to simply chat with the bot, if the checkbox is left unchecked, or use the index created with the uploaded documents for better-informed responses.

Upload documents using the top right button.
