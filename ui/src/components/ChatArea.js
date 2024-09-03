import React, { useState, useEffect, useRef } from 'react';
import { Tooltip } from 'bootstrap';
import Markdown from 'markdown-to-jsx';
import Code from './Code';
import UploadModal from './UploadModal';
import SettingsModal from './SettingsModal';
import { components } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import CustomOption from './CustomOptionForModel';
import customStyles from './customStyles';

function ChatArea({ messages, setMessages }) {
  const [greeting, setGreeting] = useState('');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [useQueryEngine, setUseQueryEngine] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [models, setModels] = useState([{value: 'mistral:instruct', label: 'mistral:instruct'}]);
  const [embed_models, setEmbedModels] = useState([{value: 'mxbai-embed-large', label: 'mxbai-embed-large'}]);
  const [selectedModel, setSelectedModel] = useState("mistral:instruct");
  const [selectedEmbedModel, setSelectedEmbedModel] = useState("mxbai-embed-large");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new Tooltip(tooltipTriggerEl));
    return () => {
      tooltipList.map(t => t.dispose());
    };
  });

  useEffect(() => {
    const currentHour = new Date().getHours();
    let greetingMessage = '';
    if (currentHour < 12) {
      greetingMessage = 'Good morning!';
    } else if (currentHour < 18) {
      greetingMessage = 'Good afternoon!';
    } else {
      greetingMessage = 'Good evening!';
    }
    setGreeting(greetingMessage);
  }, [messages]);

  async function fetchModels() {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/list_models');
      const data = await response.json();
      const llms = data.llm;
      const embed = data.embed;
      const modelOptions = llms.map(model => ({ value: 'llm', label: model }));
      const embedModelOptions = embed.map(model => ({ value: 'embed', label: model }));
      setModels(modelOptions);
      setSelectedModel(data.selectedModel || '');
      setEmbedModels(embedModelOptions);
      setSelectedEmbedModel(data.selectedEmbedModel || '');
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  }

  useEffect(() => {
    fetchModels();
  }, []);

  const handleModelChange = async (selectedOption) => {
    if (!selectedOption) return;

    try {
      if (isSending) {
        await new Promise((resolve) => {
          const interval = setInterval(() => {
            if (!isSending) {
              clearInterval(interval);
              resolve();
            }
          }, 100);
        });
      }

      setIsSending(true);
      const response = await fetch('http://127.0.0.1:5000/api/select_model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: selectedOption.label, type: selectedOption.value }),
      });
      if (!response.ok) {
        throw new Error('Failed to select model');
      }
      await fetchModels();
      setIsSending(false);
    } catch (error) {
      console.error('Error selecting model:', error);
      setIsSending(false);
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputText.trim() === '') return;

    setIsSending(true);
    const newMessage = {
      id: messages.length + 1,
      sender: 'user',
      text: inputText.trim(),
    };

    setMessages([...messages, newMessage]);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: inputText.trim(), useQueryEngine: useQueryEngine }),
      });

      if (!response.ok) {
        throw new Error('Failed to query the engine');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botMessage = '';

      const botMessageId = messages.length + 2;
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: botMessageId,
          sender: 'bot',
          text: '',
        },
      ]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        botMessage += chunk;

        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === botMessageId
              ? { ...msg, text: botMessage }
              : msg
          )
        );
      }

      setIsSending(false);

    } catch (error) {
      console.error('Error querying the engine:', error);
      setIsSending(false);
    }

    setInputText('');
  };

  const prompts = [
    "How can I plan a trip?",
    "What are some ideas for a personal project?",
    "Can you help me with time management tips?",
    "How do I create a budget?",
  ];

  const handleUpload = async (files, metadata) => {
    setIsUploading(true);
    const formData = new FormData();

    files.forEach((file, _) => {
      formData.append('files', file);
    });
  
    formData.append('metadata', JSON.stringify(metadata));
  
    try {
      const response = await fetch('http://127.0.0.1:5000/api/add_new_documents', {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error('Failed to upload documents');
      }
  
      console.log('Documents uploaded successfully');
    } catch (error) {
      console.error('Error uploading documents:', error);
    } finally {
      setIsUploading(false);
    }
  };
  

  return (
    <div className="d-flex flex-column h-100 w-100">
      {/* Full-width Navbar */}
      <nav className="navbar navbar-expand-lg" style={{height: "10%", paddingBottom: "0"}}>
        <div className="container-fluid d-flex justify-content-between">
          {/* Model Selector */}
          <div className="dropdown">
            <CreatableSelect
              defaultValue={selectedModel}
              onChange={handleModelChange}
              options={models}
              placeholder="Select or pull an LLM"
              isClearable
              className="w-100"
              styles={customStyles}
              classNamePrefix="react-select"
              components={{
                Option: (props) =>
                  props.label === "mistral:instruct" ? (
                    <components.Option {...props} />
                  ) : (
                    <CustomOption {...props} fetchModels={fetchModels} />
                  ),
              }}
              getNewOptionData={(inputValue, optionLabel) => ({ value: 'llm', label: optionLabel })}
            />
          </div>

          <div className="ps-2 dropdown">
            <CreatableSelect
              defaultValue={selectedEmbedModel}
              onChange={handleModelChange}
              options={embed_models}
              placeholder="Select or pull an embedding model"
              isClearable
              className="w-100"
              styles={customStyles}
              classNamePrefix="react-select"
              components={{
                Option: (props) =>
                  props.label === "mxbai-embed-large:latest" ? (
                    <components.Option {...props} />
                  ) : (
                    <CustomOption {...props} fetchModels={fetchModels} />
                  ),
              }}
              getNewOptionData={(inputValue, optionLabel) => ({ value: 'embed', label: optionLabel })}
            />
          </div>

          {/* Navbar Right */}
          <div className="d-flex align-items-center ms-auto">
            <button
              className="btn btn-outline-dark"
              data-bs-toggle="modal"
              data-bs-target="#uploadModal"
              title="Upload documents"
              disabled={isUploading}
            >
              {isUploading ? <i className="bi bi-pause-fill"></i> : <i className="bi bi-upload"></i>}
            </button>
            <button
              className="btn btn-outline-dark ms-2"
              data-bs-toggle="modal"
              data-bs-target="#settingsModal"
              title="Settings"
            >
              <i className="bi bi-gear"></i>
            </button>
          </div>
        </div>
      </nav>

      <UploadModal handleSave={handleUpload} />
      <SettingsModal />

      <div className='d-flex flex-column justify-content-center mx-auto' style={{ width: '50rem', height: '90%' }}>
        <div className="flex-grow-1 overflow-auto d-flex flex-column justify-content-center align-items-center px-4 mx-auto">
          {messages.length === 0 ? (
            <div className="text-center">
              <p className="fs-2 fw-bold">
                <img className='img-fluid circular-image mb-2' src="tok.jpg" alt="Logo" />
                <br />
                {greeting} How can I help you?
              </p>
            </div>
          ) : (
            <div className="message-container">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.sender === 'user' ? 'user-message ms-auto me-3' : 'bot-message me-auto ms-3'}`}
                >
                  {message.sender === 'bot' ? (
                    <Markdown options={{
                      overrides: {
                        code: {
                          component: props => {
                            const { className, children } = props;
                            if (className && className.startsWith("lang-")) {
                              return <Code {...props} className={props.className.replace(/lang/g, 'language')}>{children}</Code>;
                            } else {
                              return <code {...props}>{children}</code>;
                            }
                          }
                        }
                      }
                    }}>
                      {message.text}
                    </Markdown>
                  ) : (
                    <span>{message.text}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {messages.length === 0 && <div className="prompts d-flex flex-wrap justify-content-center">
          {prompts.map((prompt, index) => (
            <div className='slide-in-down mb-2 mx-1' key={index}>
              <button className="btn btn-outline-dark w-100 px-2 text-left" onClick={() => {
                setInputText(prompt);
                handleSubmit(new Event('submit'));
              }}>
                {prompt}
              </button>
            </div>
          ))}
        </div>}
        <form onSubmit={handleSubmit} className="pb-3">
          <div className="input-group shadow-sm rounded-pill">
            <div className="input-group-text" data-bs-toggle="tooltip" title="Enable Index Querying">
              <input
                className="form-check-input mt-0"
                type="checkbox"
                id="useQueryEngine"
                checked={useQueryEngine}
                onChange={() => setUseQueryEngine(!useQueryEngine)}
              />
            </div>
            <textarea
              value={inputText}
              onChange={handleInputChange}
              className="form-control border-end-0"
              placeholder="Type your message..."
              style={{ boxShadow: 'none', padding: '15px 20px' }}
            />
            <button
              type="submit"
              className="btn btn-dark border-start-0 px-3 border-end-0"
              data-bs-toggle="tooltip"
              title="Send Message"
              disabled={inputText.trim() === '' || isSending || isUploading}
            >
              {isSending ? (
                <i className="bi bi-pause-fill"></i>
              ) : (
                <i className="bi bi-arrow-up"></i>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChatArea;
