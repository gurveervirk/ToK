# Trove Of Knowledge (ToK)

<div align="center">
  <img height="300" width="300" alt="Trove of Knowledge Logo" src="https://github.com/gurveervirk/ToK/blob/main/app/public/tok.jpg">
</div>

**Trove of Knowledge** (ToK) is a *fully local*, *high-quality*, and *extensible Retrieval-Augmented Generation (RAG) application* that leverages AI models and indices to query documents and generate contextually accurate responses. With ToK, you can upload documents and receive more informed answers tailored to your queries. Additionally, the app automatically stores your chats, allowing you to revisit and continue conversations at any time.

## Table of Contents

- 📋 [Features](https://github.com/gurveervirk/ToK/tree/main/README.md?tab=readme-ov-file#features)
- 🛠️ [Prerequisites](https://github.com/gurveervirk/ToK/tree/main/README.md?tab=readme-ov-file#prerequisites)
- 🚀 [Getting Started](https://github.com/gurveervirk/ToK/tree/main/README.md?tab=readme-ov-file#getting-started)
- 📝 [Usage](https://github.com/gurveervirk/ToK/tree/main/README.md?tab=readme-ov-file#usage)
- 🌟 [Visual Tour](https://github.com/gurveervirk/ToK/tree/main/README.md?tab=readme-ov-file#visual-tour)

## Features

- 🛡️ **Fully Local, Secure, and Privacy-Focused:** ToK ensures that all operations are performed locally, keeping your data private and secure.
- 📂 **Versatile Document Uploading:** Upload various types of text documents and folders to create an index for more informed AI responses.
- 🏷️ **Optional Metadata Assignment:** Enhance document uploads with custom metadata, making your data more organized and accessible.
- ⚙️ **Comprehensive UI Settings:** Easily access and modify important settings like chunking options, temperature, context window size, and chat mode through the user interface.
- ✍️ **Custom Prompts:** Add and use personalized prompts for both the Large Language Model (LLM) and the chat engine, tailoring responses to your needs.
- 🗂️ **Persistent Chats with Titles:** Chats are saved with customizable titles, allowing you to revisit and continue them later.
- 📜 **Persistent Chat History:** Access and review past conversations at any time.
- 🤖 **Model Selection from Ollama:** Choose and pull AI models directly from Ollama for specific tasks and preferences.
- ⏳ **Streaming Responses with Smart Snippets:** Experience real-time responses with smart output formatting, especially for code snippets.
- 🔧 **Extensible:** Easily extend ToK's functionality with additional features or integrations.

## Prerequisites

To run ToK, you'll need to install two dependencies:

- **[Neo4j Desktop](https://neo4j.com/download/):** Used for top-tier vector and graph stores. (*install if running without docker / with the release exe*)
- **[Ollama](https://ollama.com/download):** Facilitates easy model downloading, serving, and intelligent device loading. (*required*)

### Setting Up Neo4j (IF Neo4j Desktop IS INSTALLED)

1. Download and install *Neo4j Desktop*.
2. Add the **Neo4j bin path** to your system's **PATH** environment variable. This allows Neo4j to be accessed by ToK.
   - Example bin path for Windows: `\path\to\user\.Neo4jDesktop\relate-data\dbmss\your-current-dbms\bin`

- (For Windows) Activate the Neo4j CLI by running the following command in Command Prompt or PowerShell for Windows:

   ```bash
   neo4j windows-service install
   ```

> Please go through [this link](https://neo4j.com/docs/operations-manual/current/installation/) to perform the above steps for other arch's (and for reference).

## Getting Started

You have two main options to run ToK:

### Option 1: Running ToK with Docker (RECOMMENDED)

1. Ensure you have [Docker](https://www.docker.com/products/docker-desktop) and [Docker Compose](https://docs.docker.com/compose/install/) installed on your machine.
2. Clone the repository:
   ```bash
   git clone https://github.com/gurveervirk/ToK.git
   ```
3. Navigate to the directory containing the `docker-compose.yml` file:
   ```bash
   cd ToK/docker
   ```
4. Serve Ollama on your local system. (*app may serve it automatically*)
   ```bash
   ollama serve
   ```
4. Start the application with Docker Compose:
   ```bash
   docker-compose up -d
   ```

### Option 2: Running ToK Executable

1. Visit the [Releases](https://github.com/gurveervirk/ToK/releases) page and download the latest `ToK.exe` to a location/directory (the app creates necessary files and folders for correct working).
2. Modify the settings by running the app once and clicking the settings icon at the top right hand corner:
   - **username:** Replace with your Neo4j database username.
   - **password:** Replace with the password you set in your Neo4j project.
   - **uri:** Replace with your Neo4j project's URI.

   > **Note:** The default username and URI are the default values for a Neo4j DB.
   > You can also modify it in `settings.json`, created by the app.

**Done!** You're now ready to start using ToK.

## Usage

After completing the setup:

1. Launch *ToK*.
2. Choose to either chat directly with the bot or upload documents using the top-right button for enhanced query responses.
3. Enjoy the seamless experience of interacting with a locally-run, AI-powered knowledge assistant that keeps your data private and secure.

## Visual Tour

Explore the key features and user interface of ToK through the images below:

<table align="center">
  <tr>
    <td align="center" colspan=3>
      <h4>Landing Page</h4>
      <img alt="landing_page" src="https://github.com/gurveervirk/ToK/blob/main/misc/pics/landing_page.png"
    </td>
  </tr>
  <tr>
    <td align="center">
      <h4>Upload Modal</h4>
      <img width="200" alt="file_upload" src="https://github.com/gurveervirk/ToK/blob/main/misc/pics/file_upload.png"
    </td>
    <td align="center">
      <h4>Settings Modal</h4>
      <img width="200" alt="settings" src="https://github.com/gurveervirk/ToK/blob/main/misc/pics/settings.png"
    </td>
    <td align="center">
      <h4>Prompts Modal</h4>
      <img width="200" alt="prompts" src="https://github.com/gurveervirk/ToK/blob/main/misc/pics/prompts.png"
    </td>
  </tr>
</table>
