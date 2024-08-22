import os
os.environ["TIKTOKEN_CACHE_DIR"] = 'tiktoken_cache'

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flaskwebgui import FlaskUI
from tempfile import TemporaryDirectory
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.fastembed import FastEmbedEmbedding
from llama_index.vector_stores.neo4jvector import Neo4jVectorStore
from llama_index.core.prompts import ChatMessage
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core import Settings, VectorStoreIndex, SimpleDirectoryReader, StorageContext
import json
import traceback
import subprocess
import time


app = Flask(__name__, static_folder='web/build', static_url_path='/')
ollama_process = None
CORS(app)

def start_services():
    try:
        # Start Ollama
        ollama_process = subprocess.Popen(["ollama", "serve"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("Starting Ollama...")
        time.sleep(1)  
        print("Ollama started successfully")

        # Start Neo4j
        os.system("neo4j start")
        print("Starting Neo4j...")
        time.sleep(2)
        print("Neo4j started successfully")
        
        return ollama_process

    except Exception as e:
        print("Error starting services: ", e)
        traceback.print_exc()
        exit(1)

# Function to create the prev_msgs directory if it doesn't exist
def create_directory_if_not_exists(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)

# Load settings from file
def load_settings():
    try:
        with open('settings.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("The settings file doesn't exist. Creating a new one...")
        settings = {"username": "", "password": "", "uri": ""}
        with open('settings.json', 'w+') as f:
            json.dump(settings, f)
        return settings

# Initialize global variables
def initialize_globals():
    global llm, neo4j_vector_store, vector_index, storage_context, chat_engine, memory

    try:
        settings = load_settings()

        # Initialize the embed model
        embed_model = FastEmbedEmbedding(model_name="mixedbread-ai/mxbai-embed-large-v1")
        Settings.embed_model = embed_model
        llm = Ollama(model="mistral:instruct", request_timeout=120.0, base_url="http://localhost:11434")
        Settings.llm = llm

        # Initialize LLM
        print("LLM initialized successfully")

        # Initialize Neo4j vector store and other components
        neo4j_vector_store = Neo4jVectorStore(settings['username'], settings['password'], settings['uri'], 1024, hybrid_search=True)
        vector_index = VectorStoreIndex.from_vector_store(vector_store=neo4j_vector_store)
        storage_context = StorageContext.from_defaults(vector_store=neo4j_vector_store)
        memory = ChatMemoryBuffer.from_defaults(token_limit=2048)
        chat_engine = vector_index.as_chat_engine(chat_mode="condense_plus_context", llm=llm,
            context_prompt=(
                "You are a chatbot, who needs to answer questions, preferably using the provided context"
                "Here are the relevant documents for the context:\n"
                "{context_str}"
                "\nInstruction: Use the previous chat history, or the context above, to interact and help the user."
            ), memory=memory, verbose=True
        )
        print("Vector store and chat engine initialized successfully")

    except Exception as e:
        print("Initialization error: ", e)
        traceback.print_exc()

# Functions for session management
def get_session_number():
    return len([name for name in os.listdir('prev_msgs') if os.path.isfile(os.path.join('prev_msgs', name))])

def start_new_session():
    session_num = get_session_number() + 1
    session_filename = os.path.join("prev_msgs", f"session_{session_num}.json")
    with open(session_filename, "w") as session_file:
        json.dump([], session_file)
    return session_filename

def save_to_session(session, data):
    with open(session, "r+") as session_file:
        session_data = json.load(session_file)
        session_data.append(data)
        session_file.seek(0)
        json.dump(session_data, session_file)
        session_file.truncate()

# Global variable for current session
current_session = None

@app.route('/api/query', methods=['POST'])
def query():
    try:
        global current_session
        cur_session = current_session
        data = request.json
        query = data.get('query')
        use_chat_engine = data.get('useQueryEngine', False)

        if query is None:
            return jsonify({"error": "Query parameter missing"}), 400
        
        if use_chat_engine:
            if chat_engine is None:
                return jsonify({"error": "Query engine not initialized"}), 500

            memory.put(ChatMessage.from_str(content=query))
            response = chat_engine.chat(query).response
        else:
            if llm is None:
                return jsonify({"error": "LLM not initialized"}), 500

            memory.put(ChatMessage.from_str(content=query))
            response = llm.chat(memory.get_all()).message.content

        data_to_save = {"query": query, "response": response}
        is_new_session = False

        if cur_session is None:
            is_new_session = True
            current_session = start_new_session()
            cur_session = current_session
            prompt = f'`{query}`\n\nGenerate a short and crisp title pertaining to the above query, in quotes'
            title_response = llm.complete(prompt).text.strip()
            title = {"title": title_response.split('"')[1]}
            save_to_session(cur_session, title)

        save_to_session(cur_session, data_to_save)
        return jsonify({"response": response, "is_new_session": is_new_session})
        
    except Exception as e:
        print(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_chat_history():
    session_titles = []
    for filename in os.listdir("prev_msgs"):
        if filename.endswith(".json"):
            with open(os.path.join("prev_msgs", filename), 'r') as file:
                session_data = json.load(file)
                if session_data:
                    session_titles.append([session_data[0].get('title'), filename])
    return jsonify(session_titles)

@app.route('/api/choose_chat_history', methods=['POST'])
def choose_chat_history():
    selected_filename = request.json.get('filename')
    if selected_filename is None:
        return jsonify({"error": "Filename parameter missing"}), 400

    session_file = None
    for filename in os.listdir("prev_msgs"):
        if filename == selected_filename and filename.endswith(".json"):
            with open(os.path.join("prev_msgs", filename), 'r') as file:
                session_data = json.load(file)
                if session_data:
                    session_file = session_data
                    global current_session
                    current_session = os.path.join("prev_msgs", filename)
                    break
    
    if session_file is None:
        return jsonify({"error": "Session not found"}), 404
    
    global memory
    memory = ChatMemoryBuffer.from_defaults(token_limit=2048)
    for data in session_file[1:]:
        memory.put(ChatMessage.from_str(content=data['query']))
        memory.put(ChatMessage.from_str(content=data['response'], role='assistant'))

    global chat_engine
    chat_engine = vector_index.as_chat_engine(chat_mode="condense_plus_context", llm=llm,
        context_prompt=(
            "You are a chatbot, who needs to answer questions, preferably using the provided context"
            "Here are the relevant documents for the context:\n"
            "{context_str}"
            "\nInstruction: Use the previous chat history, or the context above, to interact and help the user."
        ), memory=memory, verbose=True
    )
    return jsonify(session_file)

@app.route('/api/add_new_documents', methods=['POST'])
def add_new_documents():
    print('Adding new documents')
    try:
        # Create a temporary directory to store files
        with TemporaryDirectory() as temp_folder:
            if 'files' not in request.files:
                return jsonify({"error": "No files provided"}), 400
            
            files = request.files.getlist('files')
            for file in files:
                file_path = os.path.join(temp_folder, file.filename)
                file.save(file_path)
            
            # Read documents from the temporary directory
            documents = SimpleDirectoryReader(temp_folder).load_data()
            
            global vector_index
            global chat_engine
            vector_index = vector_index.from_documents(documents, show_progress=True, storage_context=storage_context)
            chat_engine = vector_index.as_chat_engine(chat_mode="condense_plus_context", llm=llm,
                context_prompt=(
                    "You are a chatbot, who needs to answer questions, preferably using the provided context"
                    "Here are the relevant documents for the context:\n"
                    "{context_str}"
                    "\nInstruction: Use the previous chat history, or the context above, to interact and help the user."
                ), memory=memory, verbose=True
            )
            return jsonify({"success": "Documents added successfully"}), 200
    except Exception as e:
        print(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/new_chat', methods=['GET'])
def new_chat():
    global current_session
    current_session = None
    global memory
    memory = ChatMemoryBuffer.from_defaults(token_limit=2048)
    global chat_engine
    chat_engine = vector_index.as_chat_engine(chat_mode="condense_plus_context", llm=llm,
        context_prompt=(
            "You are a chatbot, who needs to answer questions, preferably using the provided context"
            "Here are the relevant documents for the context:\n"
            "{context_str}"
            "\nInstruction: Use the previous chat history, or the context above, to interact and help the user."
        ), memory=memory, verbose=True
    )
    return jsonify({"message": "New chat session started"})

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# Initialize Flask
def start_flask_app():
    ui.run()

def cleanup():
    if ollama_process:
        ollama_process.terminate()
    os.system("neo4j stop")

if __name__ == '__main__':
    ui = FlaskUI(app = app, server="flask", width=500, height=500, port=5000, on_shutdown=cleanup) # Change width and height as needed
    try:
        create_directory_if_not_exists('prev_msgs')
        ollama_process = start_services()
        initialize_globals()
        start_flask_app()
        
    finally:
        # Terminate the services when Eel window is closed
        ollama_process.terminate()
        os.system("neo4j stop")
