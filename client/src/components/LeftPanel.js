import React, { useState, useEffect } from 'react';
import UseWindowDimensions from './UseWindowDimensions';
import { Tooltip } from 'bootstrap';

function LeftPanel({ settings, setSettings, isSidebarCollapsed, setChatStarted, setMessages}) {
  const { hf_read_token } = settings;
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const newSettings = {
      hf_read_token: hf_read_token
    };
    setSettings(newSettings);
    fetch('http://127.0.0.1:5000/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newSettings)
    })
      .then(response => console.log('Settings saved:', response))
      .catch(error => {
        console.error('Error saving settings:', error);
      });
  };

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
        setChatStarted(false);
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
            <i className="fa fa-comments me-2"></i>New Chat
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
        <div className="py-3 d-flex justify-content-center align-items-center">
          <button
            className={`btn btn-dark d-block ${isSmall ? 'w-75' : 'w-100'}`}
            data-bs-toggle="modal"
            data-bs-target="#settingsModal"
          >
            <i className="fa fa-cog me-2"></i>Settings
          </button>
        </div>
        <div className="modal fade" id="settingsModal" tabIndex="-1" aria-labelledby="settingsModalLabel" aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="settingsModalLabel">Settings</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <form className='was-validated' onSubmit={handleSubmit} noValidate>
                  <div className="mb-3">
                    <label htmlFor="hfToken" className="form-label">
                      HF Read Token
                    </label>
                    <input
                      type="password"
                      id="hfToken"
                      className="form-control"
                      value={hf_read_token}
                      onChange={(e) => setSettings(prevSettings => ({ ...prevSettings, hf_read_token: e.target.value}))}
                      required
                    />
                  </div>
                  <div className="text-end">
                    <button type="submit" className="btn btn-dark" disabled={!settings.hf_read_token} data-bs-dismiss="modal">Save</button>
                    <button type="button" className="btn btn-secondary ms-2" data-bs-dismiss="modal">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeftPanel;
