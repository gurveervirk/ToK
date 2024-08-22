import React, { useState, useEffect, useRef } from 'react';
import { Tooltip } from 'bootstrap';
import Markdown from 'markdown-to-jsx';
import Code from './Code';

function ChatArea({messages, setMessages, chatStarted, setChatStarted}) {
  const [greeting, setGreeting] = useState('');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false); // State to manage sending state
  const [useQueryEngine, setUseQueryEngine] = useState(false); // State to manage query engine checkbox
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new Tooltip(tooltipTriggerEl));
    return () => {
      tooltipList.map(t => t.dispose());
    };
  });

  useEffect(() => {
    // Get the current hour
    const currentHour = new Date().getHours();
    // Determine the appropriate greeting based on the time of day
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

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputText.trim() === '') return;

    setIsSending(true); // Start sending state
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

        // Process streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let botMessage = '';

        // Create a new bot message and add it to the messages array
        const botMessageId = messages.length + 2;
        setMessages((prevMessages) => [
            ...prevMessages,
            {
                id: botMessageId,
                sender: 'bot',
                text: '', // Initialize with an empty message
            },
        ]);

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            // Decode the chunk and append to botMessage
            const chunk = decoder.decode(value, { stream: true });
            botMessage += chunk;

            // Update bot message progressively
            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg.id === botMessageId
                        ? { ...msg, text: botMessage }
                        : msg
                )
            );
        }

        // Once complete, update the state as required
        setIsSending(false); // End sending state
        setChatStarted(true); // Set chat started state

    } catch (error) {
        console.error('Error querying the engine:', error);
        setIsSending(false); // End sending state on error
    }

    setInputText('');
  };


  // Prompts related to planning and creating
  const prompts = [
    "How can I plan a trip?",
    "What are some ideas for a personal project?",
    "Can you help me with time management tips?",
    "How do I create a budget?",
  ];

  const handleUpload = async (e) => {
    setIsUploading(true);
    const files = e.target.files;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

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
    }
    finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="d-flex flex-column h-100 px-4 mx-auto" style={{ width: '50em', overflow: 'auto' }}>
      <div className="tr-container">
        <div>
        <label htmlFor="file-upload" className="btn btn-outline-dark" data-bs-toggle="tooltip" title="Upload documents">
          { isUploading ? <i className="bi bi-pause-fill"></i> : <i className="bi bi-upload"></i> }
        </label>
        <input
          type="file"
          id="file-upload"
          className="visually-hidden"
          multiple
          onChange={handleUpload}
          disabled={isUploading}
        />
        </div>
      </div>
      <div className="flex-grow-1 overflow-auto d-flex flex-column justify-content-center align-items-center h-100">
      {messages.length === 0 ? (
          <div className="text-center">
            <p className="fs-2 fw-bold"><img className='img-fluid circular-image mb-2' src="tok.jpg" alt="Logo" /><br/>{greeting} How can I help you?</p>
          </div>
        ) : (
          <div className="message-container">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender === 'user' ? 'user-message ms-auto me-3' : 'bot-message me-auto ms-3'} ${chatStarted && message.id === messages.length ? 'is-latest' : ''}`}
              >
                {message.sender === 'bot' ? (
                  <Markdown options={{
                    overrides: {
                      code: {
                        component: props => {
                          const { className, children } = props;
                          // Check if the className starts with "lang-"
                          if (className && className.startsWith("lang-")) {
                            // Render the Code component or any other component you desire
                            return <Code {...props} className={props.className.replace(/lang/g, 'language')}>{children}</Code>;
                          } else {
                            // Render the default code element if the class name doesn't match
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
          <div className='slide-in-down mb-2 mx-1'>
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
            style={{ boxShadow: 'none', padding: '15px 20px' }} // Remove default box-shadow
          />
          <button
            type="submit"
            className="btn btn-dark border-start-0 px-3 border-end-0"
            data-bs-toggle="tooltip"
            title="Send Message"
            disabled={inputText.trim() === '' || isSending} // Disable button during sending or if input is empty
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
  );
}

export default ChatArea;
