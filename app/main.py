import os
import sys

if getattr(sys, 'frozen', False):
    # If the application is running as a bundled executable
    bundle_dir = sys._MEIPASS
else:
    # If running in a normal Python environment
    bundle_dir = os.path.dirname(os.path.abspath(__file__))

os.environ["TIKTOKEN_CACHE_DIR"] = os.path.join(bundle_dir, 'tiktoken_cache')
os.environ["NLTK_DATA"] = os.path.join(bundle_dir, 'nltk_data')

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
# Uncomment the line under to use FlaskUI
# from flaskwebgui import FlaskUI
from flask_swagger_ui import get_swaggerui_blueprint
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.vector_stores.neo4jvector import Neo4jVectorStore
from llama_index.core.prompts import ChatMessage
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core import Settings, VectorStoreIndex, StorageContext, SimpleDirectoryReader
from datetime import datetime, timedelta
from tempfile import TemporaryDirectory
import ollama
import json
import traceback
import time
from tqdm import tqdm
import subprocess
import platform

app = Flask(__name__, static_folder='web/build', static_url_path='/')
ollama_process = None
CORS(app)

# Path to your Swagger YAML file
SWAGGER_URL = '/api/docs'  # URL for exposing Swagger UI
API_URL = '/swagger.yaml'  # URL for your swagger.yaml file

# Register the Swagger UI blueprint at /api/docs
swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,
    API_URL,
    config={  # Swagger UI config overrides
        'app_name': "ToK"
    }
)
app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)

def start_services():
    global ollama_process
    try:
        # Start Ollama
        ollama_process = subprocess.Popen(["ollama", "serve"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("Starting Ollama...")
        print("Ollama started successfully")

        time.sleep(1)

        # Start Neo4j
        if platform.system() == "Linux":
            os.system("systemctl enable neo4j.service")
        else:
            os.system("neo4j start")

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
    global settings
    try:
        with open('settings.json', 'r') as f:
            settings = json.load(f)
        
        if not isinstance(settings["password"], str):
            print("Password not a string. Required for correct operation. Fixing...")
            with open('settings.json', 'w') as f:
                settings["password"] = str(settings["password"])
                json.dump(settings, f)

    except FileNotFoundError:
        print("The settings file doesn't exist. Creating a new one...")
        settings = {
            "database": "neo4j",
            "password": "default_password",
            "uri": "bolt://localhost:7687",
            "chunk_size": 1024,
            "chunk_overlap": 20,
            "temperature": 0.75,
            "context_window": 3900,
            "token_limit": 2048,
            "chat_mode": "condense_plus_context"
        }
        with open('settings.json', 'w+') as f:
            json.dump(settings, f)

# Load prompts from file
def load_prompts():
    global prompts
    try:
        with open('prompts.json', 'r') as f:
            prompts = json.load(f)
    except FileNotFoundError:
        print("The prompts file doesn't exist. Creating a new one...")
        prompts = {
            "LLM": {
                "default": 0,
                "prompts":[
                    {"label": "default_prompt", "value": ""}
                ]
            },
            "Chat Engine": {
                "default": 0,
                "prompts":[
                    {"label": "default_prompt", "value": "You are a chatbot, who needs to answer questions, preferably using the provided context.\nHere are the relevant documents for the context:\n{context_str}\nInstruction: Use the previous chat history, or the context above, to interact and help the user."}
                ]
            }
        }
        with open('prompts.json', 'w+') as f:
            json.dump(prompts, f)

def load_models():
    global models
    try:
        with open('models.json', 'r') as f:
            models = json.load(f)
    except FileNotFoundError:
        print("The models file doesn't exist. Creating a new one...")
        models = {
            "llm": ["mistral:instruct"],
            "embed": ["mxbai-embed-large:latest"]
        }
        with open('models.json', 'w+') as f:
            json.dump(models, f)
    finally:
        ollama_models = [model["name"] for model in ollama.list()['models']]
        if "mistral:instruct" not in ollama_models:
            print("Loading default llm...")
            current_digest, bars = '', {}
            for progress in ollama.pull("mistral:instruct", stream=True):
                digest = progress.get('digest', '')
                if digest != current_digest and current_digest in bars:
                    bars[current_digest].close()

                if not digest:
                    print(progress.get('status'))
                    continue

                if digest not in bars and (total := progress.get('total')):
                    bars[digest] = tqdm(total=total, desc=f'pulling {digest[7:19]}', unit='B', unit_scale=True)

                if completed := progress.get('completed'):
                    bars[digest].update(completed - bars[digest].n)

                current_digest = digest
        if "mxbai-embed-large:latest" not in ollama_models:
            print("Loading default embed model...")
            current_digest, bars = '', {}
            for progress in ollama.pull("mxbai-embed-large:latest", stream=True):
                digest = progress.get('digest', '')
                if digest != current_digest and current_digest in bars:
                    bars[current_digest].close()

                if not digest:
                    print(progress.get('status'))
                    continue

                if digest not in bars and (total := progress.get('total')):
                    bars[digest] = tqdm(total=total, desc=f'pulling {digest[7:19]}', unit='B', unit_scale=True)

                if completed := progress.get('completed'):
                    bars[digest].update(completed - bars[digest].n)

                current_digest = digest

# Initialize global variables
def initialize_globals():
    global llm, vector_store, vector_index, storage_context, chat_engine, memory, models, current_model, current_embed_model, settings, prompts, selected_LLM_prompt, selected_chat_engine_prompt

    try:
        load_settings()
        load_prompts()
        load_models()
        current_model = "mistral:instruct"
        current_embed_model = "mxbai-embed-large:latest"

        # Initialize the embed model
        embed_model = OllamaEmbedding(model_name=current_embed_model, base_url="http://localhost:11434")
        Settings.embed_model = embed_model
        llm = Ollama(model=current_model, request_timeout=120.0, base_url="http://localhost:11434", temperature=settings["temperature"], context_window=settings["context_window"])
        Settings.llm = llm
        Settings.chunk_size = settings["chunk_size"]
        Settings.chunk_overlap = settings["chunk_overlap"]

        # Initialize LLM
        print("LLM initialized successfully")

        selected_LLM_prompt = prompts["LLM"]["prompts"][prompts["LLM"]["default"]]
        selected_chat_engine_prompt = prompts["Chat Engine"]["prompts"][prompts["Chat Engine"]["default"]]

        # Initialize Neo4j vector store and other components
        vector_store = Neo4jVectorStore(settings['database'], settings['password'], settings['uri'], 1024, hybrid_search=True)
        vector_index = VectorStoreIndex.from_vector_store(vector_store=vector_store)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        memory = ChatMemoryBuffer.from_defaults(token_limit=settings["token_limit"])
        chat_engine = vector_index.as_chat_engine(chat_mode=settings["chat_mode"], llm=llm,
            context_prompt=(
                selected_chat_engine_prompt["value"]
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

current_session = None
current_session_updated = False

def save_to_session(session, data):
    global current_session_updated
    with open(session, "r+") as session_file:
        session_data = json.load(session_file)
        if not current_session_updated: session_data[0]["date"] = str(datetime.now())
        session_data.append(data)
        session_file.seek(0)
        json.dump(session_data, session_file)
        session_file.truncate()

# Serve the Swagger YAML file directly
@app.route('/swagger.yaml')
def swagger_yaml():
    return send_from_directory('web/build/static', 'swagger.yaml')

@app.route('/api/query', methods=['POST'])
def query():
    try:
        global current_session
        global memory
        global chat_engine
        global llm
        global selected_LLM_prompt
        cur_session = current_session
        data = request.json
        query = data.get('query')
        use_chat_engine = data.get('useQueryEngine', False)
        bot_message = ""
        if query is None:
            return jsonify({"error": "Query parameter missing"}), 400

        # Start the appropriate engine
        if use_chat_engine:
            if chat_engine is None:
                return jsonify({"error": "Query engine not initialized"}), 500
            memory.put(ChatMessage.from_str(content=query))
            response_generator = chat_engine.stream_chat(query).response_gen
        else:
            if llm is None:
                return jsonify({"error": "LLM not initialized"}), 500
            query += selected_LLM_prompt["value"]
            memory.put(ChatMessage.from_str(content=query))
            response_generator = llm.stream_chat(memory.get_all())

        def generate_response():
            nonlocal bot_message
            nonlocal cur_session
            global current_session
            global current_session_updated
            nonlocal use_chat_engine

            try:
                for res in response_generator:
                    if not use_chat_engine: 
                        res = res.delta
                    yield res
                    bot_message += res
                # Store the complete message
                data_to_save = {"query": query, "response": bot_message}

                if cur_session is None:
                    current_session = start_new_session()
                    cur_session = current_session
                    # Generate title for the session
                    prompt = f'`{query}`\n\nGenerate a short and crisp title pertaining to the above query, in quotes'
                    title_response = llm.complete(prompt).text.strip()
                    title = {"title": title_response.split('"')[1], "date": str(datetime.now())}
                    current_session_updated = True
                    save_to_session(cur_session, title)

                if not use_chat_engine:
                    memory.put(ChatMessage.from_str(content=bot_message, role='assistant'))

                save_to_session(cur_session, data_to_save)

            except Exception as e:
                print(f"Error streaming response: {e}")
                traceback.print_exc()
                yield "[ERROR] Something went wrong. Please try again later."

        return app.response_class(generate_response(), mimetype='text/plain')

    except Exception as e:
        print(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_chat_history():
    session_titles = {
        "Today": {},
        "Last Week": {},
        "Last Month": {},
        "Older": {}
    }
    today = datetime.now().date()
    last_week = today - timedelta(days=7)
    last_month = today - timedelta(days=30)
    for filename in os.listdir("prev_msgs"):
        if filename.endswith(".json"):
            with open(os.path.join("prev_msgs", filename), 'r') as file:
                session_data = json.load(file)
                if session_data:
                    session_date = datetime.strptime(session_data[0].get('date'), "%Y-%m-%d %H:%M:%S.%f").date()
                    session_title = session_data[0].get('title')
                    if session_date == today:
                        session_titles["Today"][session_title] = filename
                    elif session_date > last_week:
                        session_titles["Last Week"][session_title] = filename
                    elif session_date > last_month:
                        session_titles["Last Month"][session_title] = filename
                    else:
                        session_titles["Older"][session_title] = filename
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
                    global current_session_updated
                    current_session = os.path.join("prev_msgs", filename)
                    current_session_data = json.load(open(current_session, 'r'))
                    if current_session_data[0]["date"] != str(datetime.now()): current_session_updated = False
                    break
    
    if session_file is None:
        return jsonify({"error": "Session not found"}), 404
    
    global memory
    global settings
    memory = ChatMemoryBuffer.from_defaults(token_limit=settings["token_limit"])
    for data in session_file[1:]:
        memory.put(ChatMessage.from_str(content=data['query']))
        memory.put(ChatMessage.from_str(content=data['response'], role='assistant'))

    global chat_engine
    global llm
    global selected_chat_engine_prompt
    chat_engine = vector_index.as_chat_engine(chat_mode=settings["chat_mode"], llm=llm,
        context_prompt=(
            selected_chat_engine_prompt["value"]
        ), memory=memory, verbose=True
    )
    return jsonify(session_file)

@app.route('/api/add_new_documents', methods=['POST'])
def add_new_documents():
    print('Adding new documents')
    try:
        with TemporaryDirectory() as temp_folder:
            # Retrieve the form data
            if 'metadata' not in request.form or 'files' not in request.files:
                return jsonify({"error": "Missing files or metadata in form data"}), 400

            files = request.files.getlist('files')
            metadata = request.form.get('metadata')

            if not files:
                return jsonify({"error": "No files provided"}), 400

            metadata = json.loads(metadata)

            # Save files to the temporary directory, maintaining folder structure
            for file in files:
                relative_path = file.filename  # This will include the relative folder structure
                save_path = os.path.join(temp_folder, relative_path)

                # Create necessary directories
                os.makedirs(os.path.dirname(save_path), exist_ok=True)

                # Save the file
                file.save(save_path)

            # Convert metadata from list of dicts to a single dict
            meta = lambda filename: {"file_name": filename, **{m["key"]: m["value"] for m in metadata if m["key"] and m["value"]}}

            # Collect all file paths for the SimpleDirectoryReader
            files = [
                os.path.join(root, name)
                for root, _, filenames in os.walk(temp_folder)
                for name in filenames
            ]

            # Use SimpleDirectoryReader to read the saved files
            documents = SimpleDirectoryReader(input_files=files, file_metadata=meta, recursive=True).load_data()

            if not documents:
                return jsonify({"error": "No valid documents found"}), 400

            # Update the vector index with the new documents
            global vector_index
            global chat_engine
            global memory
            global storage_context
            global selected_chat_engine_prompt
            global llm
            global settings
            
            vector_index = vector_index.from_documents(documents, show_progress=True, storage_context=storage_context)
            
            # Update the chat engine to use the new documents
            chat_engine = vector_index.as_chat_engine(
                chat_mode=settings["chat_mode"],
                llm=llm,
                context_prompt=(selected_chat_engine_prompt["value"]),
                memory=memory,
                verbose=True
            )

            return jsonify({"success": "Documents added successfully"}), 200

    except Exception as e:
        print(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/new_chat', methods=['GET'])
def new_chat():
    global current_session
    global current_session_updated
    current_session = None
    current_session_updated = False
    global memory
    memory = ChatMemoryBuffer.from_defaults(token_limit=2048)
    global chat_engine
    global llm
    global selected_chat_engine_prompt
    global settings
    chat_engine = vector_index.as_chat_engine(chat_mode=settings["chat_mode"], llm=llm,
        context_prompt=(
            selected_chat_engine_prompt["value"]
        ), memory=memory, verbose=True
    )
    return jsonify({"message": "New chat session started"})

@app.route('/api/list_models', methods=['GET'])
def list_models():
    global models
    global current_model
    global current_embed_model
    try:
        return jsonify({"llm": models["llm"], "embed": models["embed"], "selectedModel": current_model, "selectedEmbedModel": current_embed_model})
    except Exception as e:
        print(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/select_model', methods=['POST'])
def select_model():
    global current_model
    global models
    global llm
    global chat_engine
    global memory
    global vector_index
    global selected_chat_engine_prompt
    global settings
    global current_embed_model

    data = request.json
    new_model = data.get('model')
    type = data.get('type')

    if new_model is None:
        return jsonify({"error": "Model parameter missing"}), 400
    
    if new_model not in models["llm"] and new_model not in models["embed"]:
        try:
            current_digest, bars = '', {}
            for progress in ollama.pull(new_model, stream=True):
                digest = progress.get('digest', '')
                if digest != current_digest and current_digest in bars:
                    bars[current_digest].close()

                if not digest:
                    print(progress.get('status'))
                    continue

                if digest not in bars and (total := progress.get('total')):
                    bars[digest] = tqdm(total=total, desc=f'pulling {digest[7:19]}', unit='B', unit_scale=True)

                if completed := progress.get('completed'):
                    bars[digest].update(completed - bars[digest].n)

                current_digest = digest
                if type == "llm":
                    models["llm"].append(new_model)
                else:
                    models["embed"].append(new_model)
            
        except Exception as e:
            print(e)
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500
    
    if type == "llm":
        if new_model == current_model:
            return jsonify({"message": "Model already selected"})
        current_model = new_model
        llm = Ollama(model=new_model, request_timeout=120.0, base_url="http://localhost:11434")
        Settings.llm = llm
        chat_engine = vector_index.as_chat_engine(chat_mode=settings["chat_mode"], llm=llm,
            context_prompt=(
                selected_chat_engine_prompt["value"]
            ), memory=memory, verbose=True
        )
    else:
        if new_model == current_embed_model:
            return jsonify({"message": "Model already selected"})
        current_embed_model = new_model
        embed_model = OllamaEmbedding(model_name=new_model, base_url="http://localhost:11434")
        Settings.embed_model = embed_model
    
    with open('models.json', 'w') as f:
        json.dump(models, f)
    
    return jsonify({"message": "Model changed successfully"})

@app.route('/api/delete_model', methods=['POST'])
def delete_model():
    global models
    global current_model
    global current_embed_model
    global llm
    global chat_engine
    global memory
    global vector_index
    global storage_context
    global selected_chat_engine_prompt
    global settings

    data = request.json
    model = data.get('model')
    type = data.get('type')

    if model is None:
        return jsonify({"error": "Model parameter missing"}), 400

    try:
        if type == 'llm':
            if model == current_model:
                current_model = "mistral:instruct"
                llm = Ollama(model=current_model, request_timeout=120.0, base_url="http://localhost:11434", temperature=settings["temperature"], context_window=settings["context_window"])
                Settings.llm = llm
                chat_engine = vector_index.as_chat_engine(chat_mode=settings["chat_mode"], llm=llm,
                    context_prompt=(
                        selected_chat_engine_prompt["value"]
                    ), memory=memory, verbose=True
                )
            models["llm"] = [m for m in models["llm"] if m != model]
        else:
            if model == current_embed_model:
                current_embed_model = "mxbai-embed-large:latest"
                embed_model = OllamaEmbedding(model_name=current_embed_model, base_url="http://localhost:11434")
                Settings.embed_model = embed_model
            models["embed"] = [m for m in models["embed"] if m != model]
        ollama.delete(model)
        with open('models.json', 'w') as f:
            json.dump(models, f)
        return jsonify({"message": "Model deleted successfully"})
    except Exception as e:
        print(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/prompts', methods=['GET'])
def list_prompts():
    global prompts
    global selected_LLM_prompt
    global selected_chat_engine_prompt
    try:
        return jsonify({"prompts": prompts, "selectedLLMPrompt": selected_LLM_prompt, "selectedChatEnginePrompt": selected_chat_engine_prompt, "defaults": {"LLM": prompts["LLM"]["default"], "Chat Engine": prompts["Chat Engine"]["default"]}})
    except Exception as e:
        print(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/prompts', methods=['POST'])
def update_prompts():
    global prompts
    global selected_LLM_prompt
    global selected_chat_engine_prompt
    global chat_engine
    global memory
    global settings
    try:
        data = request.json
        prompts["LLM"]["prompts"] = data.get('LLM')
        prompts["Chat Engine"]["prompts"] = data.get('Chat')
        defaults = data.get('defaults')
        prompts["LLM"]["default"] = defaults["LLM"]
        prompts["Chat Engine"]["default"] = defaults["Chat"]

        selected_LLM_prompt = data["selectedLLMPrompt"]
        selected_chat_engine_prompt = data["selectedChatEnginePrompt"]
        
        with open('prompts.json', 'w') as f:
            json.dump(prompts, f)
        
        chat_engine = vector_index.as_chat_engine(chat_mode=settings["chat_mode"], llm=llm,
            context_prompt=(
                selected_chat_engine_prompt["value"]
            ), memory=memory, verbose=True
        )
        return jsonify({"message": "Prompts updated successfully"})
    except Exception as e:
        print(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/delete_prompt', methods=['POST'])
def delete_prompt():
    global prompts
    try:
        data = request.json
        prompt_type = data.get('type')
        prompt_name = data.get('label')
        if prompt_type == "LLM":
            prompts["LLM"]["prompts"] = [prompt for prompt in prompts["LLM"]["prompts"] if prompt["label"] != prompt_name]
        else:
            prompts["Chat Engine"]["prompts"] = [prompt for prompt in prompts["Chat Engine"]["prompts"] if prompt["label"] != prompt_name]
        with open('prompts.json', 'w') as f:
            json.dump(prompts, f)
        return jsonify({"message": "Prompt deleted successfully"})
    except Exception as e:
        print(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/settings', methods=['GET'])
def get_settings():
    global settings
    try:
        return jsonify(settings)
    except Exception as e:
        print(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings', methods=['POST'])
def update_settings():
    global settings
    global chat_engine
    global memory
    global llm
    global selected_chat_engine_prompt
    global vector_store
    global vector_index
    global storage_context
    try:
        data = request.json
        settings["database"] = data.get('database')
        settings["password"] = str(data.get('password'))
        settings["uri"] = data.get('uri')
        settings["chunk_size"] = data.get('chunk_size')
        settings["chunk_overlap"] = data.get('chunk_overlap')
        settings["temperature"] = data.get('temperature')
        settings["context_window"] = data.get('context_window')
        settings["token_limit"] = data.get('token_limit')
        settings["chat_mode"] = data.get('chat_mode')
        
        with open('settings.json', 'w') as f:
            json.dump(settings, f)

        llm = Ollama(model=current_model, request_timeout=120.0, base_url="http://localhost:11434", temperature=settings["temperature"], context_window=settings["context_window"])
        Settings.llm = llm
        Settings.chunk_size = settings["chunk_size"]
        Settings.chunk_overlap = settings["chunk_overlap"]
        vector_store = Neo4jVectorStore(settings['database'], settings['password'], settings['uri'], 1024, hybrid_search=True)
        vector_index = VectorStoreIndex.from_vector_store(vector_store=vector_store)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        memory = ChatMemoryBuffer.from_defaults(token_limit=settings["token_limit"])
        chat_engine = vector_index.as_chat_engine(chat_mode=settings["chat_mode"], llm=llm,
            context_prompt=(
                selected_chat_engine_prompt["value"]
            ), memory=memory, verbose=True
        )
        return jsonify({"message": "Settings updated successfully"})
    except Exception as e:
        print(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# Initialize Flask
def start_flask_app():
    # Uncomment the line under to use FlaskUI
    # ui.run()
    app.run(port=8000, debug=False)

def cleanup():
    global ollama_process
    
    # Terminate the ollama process if it exists
    if ollama_process:
        ollama_process.terminate()
    
    # Stop Neo4j service (assuming this is required on all systems)
    os.system("neo4j stop")

if __name__ == '__main__':
    # Uncomment the line under to use FlaskUI
    # ui = FlaskUI(app=app, server="flask", width=1280, height=720, port=5000, on_shutdown=cleanup)
    try:
        create_directory_if_not_exists('prev_msgs')
        start_services()
        initialize_globals()
        start_flask_app()
        
    finally:
        print("Cleaning up...")
        ollama_process.terminate()
        os.system("neo4j stop")
