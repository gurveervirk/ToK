from flask import Flask, jsonify, request
from flask_cors import CORS
from tempfile import TemporaryDirectory
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core import Settings, VectorStoreIndex, SimpleDirectoryReader, StorageContext
from llama_index.core.prompts import ChatMessage
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.llms.ollama import Ollama
from llama_index.vector_stores.neo4jvector import Neo4jVectorStore
import chromadb
import json
import os
import traceback

app = Flask(__name__)
CORS(app)

# Function to create the prev_msgs directory if it doesn't exist
def create_directory_if_not_exists(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)

try:
    with open('settings.json', 'r') as f:
        settings = json.load(f)
except FileNotFoundError:
    print("The settings file doesn't exist. Creating a new one...")
    # Create an empty settings dictionary
    settings = {}
    # Write an empty JSON object to the file
    with open('settings.json', 'w+') as f:
        json.dump(settings, f)

create_directory_if_not_exists('prev_msgs')
create_directory_if_not_exists('storage')
embed_model = HuggingFaceEmbedding(model_name="mixedbread-ai/mxbai-embed-large-v1", device='cuda')
Settings.embed_model = embed_model
Settings.chunk_size = 1024

llm = None
neo4j_vector_store = None
chat_engine = None
vector_index = None
storage_context = None
memory = ChatMemoryBuffer.from_defaults(token_limit=2048)

def get_session_number():
    return len([name for name in os.listdir('prev_msgs') if os.path.isfile(os.path.join('prev_msgs', name))])

def start_new_session():
    session_num = get_session_number() + 1
    session_filename = os.path.join("prev_msgs", f"session_{session_num}.json")
    with open(session_filename, "w") as session_file:
        json.dump([], session_file)
    return session_filename

current_session = None

def save_to_session(data):
    with open(current_session, "r+") as session_file:
        session_data = json.load(session_file)
        session_data.append(data)
        session_file.seek(0)
        json.dump(session_data, session_file)
        session_file.truncate()

try:
    llm = Ollama(model="mistral:instruct", request_timeout=120.0, base_url="http://localhost:11435")
    Settings.llm = llm
    print("LLM initialized successfully")
except Exception as e:
    print("Error while initializing HuggingFaceInferenceAPI: ", e)

try:
    neo4j_vector_store = Neo4jVectorStore(settings['username'], settings['password'], settings['uri'], 1024, hybrid_search=True)
    vector_index = VectorStoreIndex.from_vector_store(vector_store=neo4j_vector_store)
    storage_context = StorageContext.from_defaults(vector_store=neo4j_vector_store)
    chat_engine = vector_index.as_chat_engine(chat_mode="condense_plus_context",llm=llm,
    context_prompt=(
        "You are a chatbot, who needs to answer questions, preferably using the provided context"
        "Here are the relevant documents for the context:\n"
        "{context_str}"
        "\nInstruction: Use the previous chat history, or the context above, to interact and help the user."
    ), memory=memory, verbose=True)
    print("Vector store initialized successfully")

except Exception as e:
    print("Vector error: ", e)

@app.route('/api/query', methods=['POST'])
def query():
    try:
        global current_session, llm
        data = request.json
        query = data['query']
        use_chat_engine = data['useQueryEngine']
        data_to_save = None
        is_new_session = False
        response = None

        if query is None:
            return jsonify({"error": "Query parameter missing"}), 400
        
        if use_chat_engine:
            if chat_engine is None:
                return jsonify({"error": "Query engine not initialized"}), 500
            
            global memory
            memory.put(ChatMessage.from_str(content=query))
            response = chat_engine.chat(query).response
            data_to_save = {"query": query, "response": response}
        
        else:
            if llm is None:
                return jsonify({"error": "LLM not initialized"}), 500
            
            memory.put(ChatMessage.from_str(content=query))
            response = llm.chat(memory.get_all())
            memory.put(response.message)
            response = response.message.content
            data_to_save = {"query": query, "response": response}
        
        if current_session is None:
            is_new_session = True
            current_session = start_new_session()
            prompt = '`' + query + '`' + '\n\n' + 'Generate a short and crisp title pertaining to the above query, in quotes'
            title_response = llm.complete(prompt).text.strip()
            start = title_response.find('"') + 1
            end = title_response[start:].find('"')
            title_response = title_response[start:start+end]
            title = {"title": title_response}
            save_to_session(title)
        
        save_to_session(data_to_save)
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
        return jsonify({"error": "Title parameter missing"}), 400
    
    session_file = None
    for filename in os.listdir("prev_msgs"):
        if filename.endswith(".json"):
            if filename == selected_filename:
                with open(os.path.join("prev_msgs", filename), 'r') as file:
                    session_data = json.load(file)
                    if session_data:
                        global current_session
                        session_file = session_data
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
    chat_engine = vector_index.as_chat_engine(chat_mode="condense_plus_context",llm=llm,
    context_prompt=(
        "You are a chatbot, who needs to answer questions, preferably using the provided context"
        "Here are the relevant documents for the context:\n"
        "{context_str}"
        "\nInstruction: Use the previous chat history, or the context above, to interact and help the user."
    ), memory=memory, verbose=True)
    return jsonify(session_file)

@app.route('/api/add_new_documents', methods=['POST'])
def add_new_documents():
    print('Adding new documents')
    try:
        # Create a temporary directory to store files
        with TemporaryDirectory() as temp_folder:
            global vector_index
            global chat_engine
            # Check if files are in the request
            if 'files' not in request.files:
                return jsonify({"error": "No files provided"}), 400
            
            # Get list of files
            files = request.files.getlist('files')
            
            # Save files to temporary directory
            for file in files:
                file_path = os.path.join(temp_folder, file.filename)
                file.save(file_path)
            
            # Read documents from the temporary directory
            documents = SimpleDirectoryReader(temp_folder).load_data()
            
            # Put documents into the vector store index
            vector_index = vector_index.from_documents(documents, show_progress=True, storage_context=storage_context)
            chat_engine = vector_index.as_chat_engine(chat_mode="condense_plus_context",llm=llm,
    context_prompt=(
        "You are a chatbot, who needs to answer questions, preferably using the provided context"
        "Here are the relevant documents for the context:\n"
        "{context_str}"
        "\nInstruction: Use the previous chat history, or the context above, to interact and help the user."
    ), memory=memory, verbose=True)
            
            return jsonify({"success": "Documents added successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/new_chat', methods=['GET'])
def new_chat():
    global current_session
    current_session = None

    global memory
    memory = ChatMemoryBuffer.from_defaults(token_limit=2048)

    global chat_engine
    chat_engine = vector_index.as_chat_engine(chat_mode="condense_plus_context",llm=llm,
    context_prompt=(
        "You are a chatbot, who needs to answer questions, preferably using the provided context"
        "Here are the relevant documents for the context:\n"
        "{context_str}"
        "\nInstruction: Use the previous chat history, or the context above, to interact and help the user."
    ), memory=memory, verbose=True)
    return jsonify({"message": "New chat session started"})

if __name__ == '__main__':
    app.run(debug=True)
