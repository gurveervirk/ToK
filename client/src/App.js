import React, { useState, useEffect } from 'react';
import ChatArea from './components/ChatArea';
import LeftPanel from './components/LeftPanel';
import UseWindowDimensions from './components/UseWindowDimensions';

function App() {
  const isSmall = UseWindowDimensions();
  const [settings, setSettings] = useState([]);
  const [allSettingsFilled, setAllSettingsFilled] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [chatStarted, setChatStarted] = useState(false); // State to manage chat started state
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/settings')
      .then(response => response.json())
      .then(data => {
        setSettings(data);
        setAllSettingsFilled(Object.values(data).every(value => value !== null));
      })
      .catch(error => console.error('Error fetching settings:', error));
  }, []);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="container-fluid vh-100">
      <div className="row vh-100">
        <div className="col-auto bg-light justify-content-center align-items-center">
          <LeftPanel isSidebarCollapsed={isSidebarCollapsed} settings={settings} setSettings={setSettings} toggleSidebarCollapse={toggleSidebarCollapse} setMessages={setMessages} setChatStarted={setChatStarted}/>
        </div>
        <div className="col ps-0 d-flex justify-content-center align-items-center h-100">
          <button
              className="btn btn-primary-outline ms-1 w-5 h-25"
              onClick={toggleSidebarCollapse}
              type='button'
              data-bs-toggle={isSmall ? "offcanvas" : ""}
              data-bs-target={isSmall ? "#sidebar" : ""}
            >
            { isSmall ? <i className="fa-solid fa-ellipsis-vertical"></i> :
            isSidebarCollapsed ? (
              <i className="fa fa-chevron-right"></i>
            ) : (
              <i className="fa fa-chevron-left"></i>
            )}
          </button>
          <ChatArea allSettingsFilled={allSettingsFilled} messages={messages} setMessages={setMessages} chatStarted={chatStarted} setChatStarted={setChatStarted}/>
        </div>
      </div>
    </div>
  );
}

export default App;
