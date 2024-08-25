import React, { useState, useEffect } from 'react';
import UseWindowDimensions from './UseWindowDimensions';
import { Tooltip } from 'bootstrap';

function LeftPanel({isSidebarCollapsed, setMessages}) {
  const [sessionTitles, setSessionTitles] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const isSmall = UseWindowDimensions();

  useEffect(() => {
    // Fetch session titles when the component mounts
    fetch('http://127.0.0.1:5000/api/history')
      .then(response => response.json())
      .then(data => setSessionTitles(data))
      .catch(error => console.error('Error fetching session titles:', error));
  }, []);

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new Tooltip(tooltipTriggerEl));
    return () => {
      tooltipList.map(t => t.dispose());
    };
  });

  useEffect(() => {
    const storedSession = sessionStorage.getItem('selectedSession');
    if (storedSession) {
      setSelectedSession(storedSession);
      fetch('http://127.0.0.1:5000/api/choose_chat_history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename: storedSession })
      }).then(response => {
        if (!response.ok) {
          throw new Error('Failed to select session');
        }
        return response.json();
      })
      .then(data => {
        setMessages(() => {
          let nextId = 1; // Start id from 1
          const newMessages = [];
          for (let i = 1; i < data.length; i++) {
            newMessages.push(
              { id: nextId++, sender: 'user', text: data[i].query },
              { id: nextId++, sender: 'bot', text: data[i].response }
            );
          }
          return newMessages;
        });
      });
    }
  }, []);

  const handleSessionSelect = (mapping) => {
    fetch('http://127.0.0.1:5000/api/choose_chat_history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename: mapping })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to select session');
        }
        return response.json();
      })
      .then(data => {
        setSelectedSession(mapping);
        sessionStorage.setItem('selectedSession', mapping);
        setMessages(() => {
          let nextId = 1; // Start id from 1
          const newMessages = [];
          for (let i = 1; i < data.length; i++) {
            newMessages.push(
              { id: nextId++, sender: 'user', text: data[i].query },
              { id: nextId++, sender: 'bot', text: data[i].response }
            );
          }
          return newMessages;
        });
      })
      .catch(error => {
        console.error('Error selecting session:', error);
      });
  };

  
  return (
    <div id='sidebar' className={`${isSmall ? 'offcanvas offcanvas-start' : 'collapse collapse-horizontal'} ${isSidebarCollapsed ? (isSmall ? 'show' : 'hide') : (isSmall ? 'hide' : 'show')} h-100`} tabIndex={isSmall ? '-1' : ''} style={isSmall ? {} : { width: '15rem' }} data-bs-backdrop="false">
      <div className="d-flex flex-column h-100">
        {isSmall ? 
        <div className="offcanvas-header">
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div> : ''}
        <div className="py-3 d-flex justify-content-center align-items-center">
          <button
            className={`btn btn-secondary d-block ${isSmall ? 'w-75' : 'w-100'}`}
            onClick={() => {
              setMessages([]);
              setSelectedSession('');
              sessionStorage.removeItem('selectedSession');
              fetch('http://localhost:5000/api/new_chat')
                .then(response => { console.log('New chat started:', response); })
              
              fetch('http://127.0.0.1:5000/api/history')
              .then(response => response.json())
              .then(data => setSessionTitles(data))
              .catch(error => console.error('Error fetching session titles:', error));
            }}
          >
            <i className="bi bi-chat-text"></i> New Chat
          </button>
        </div>
        <div className="py-3 flex-grow-1 d-flex flex-column justify-content-center align-items-center">
            {sessionTitles.length > 0 ? (
              sessionTitles.map((mapping, index) => (
                <div className="w-100">
                  <button
                    key={index}
                    className={`btn btn-outline-dark d-block ${selectedSession && selectedSession === mapping[1] ? 'active' : ''} mb-1`}
                    onClick={() => handleSessionSelect(mapping[1])}
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', whiteSpace: 'nowrap'}}
                    data-bs-toggle="tooltip" title={mapping[0]}
                  >
                    {mapping[0]}
                  </button>
                </div>
              ))
            ) : (
              "No previous sessions found"
            )}
        </div>
      </div>
    </div>
  );
}

export default LeftPanel;
