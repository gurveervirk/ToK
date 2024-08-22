import React, { useState } from 'react';
import ChatArea from './components/ChatArea';
import LeftPanel from './components/LeftPanel';
import UseWindowDimensions from './components/UseWindowDimensions';

function App() {
  const isSmall = UseWindowDimensions();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [chatStarted, setChatStarted] = useState(false); // State to manage chat started state
  const [messages, setMessages] = useState([]);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="container-fluid vh-100">
      <div className="row vh-100">
        <div className="col-auto bg-light justify-content-center align-items-center">
          <LeftPanel isSidebarCollapsed={isSidebarCollapsed} toggleSidebarCollapse={toggleSidebarCollapse} setMessages={setMessages} setChatStarted={setChatStarted}/>
        </div>
        <div className="col ps-0 d-flex justify-content-center align-items-center h-100">
          <button
              className="btn btn-primary-outline ms-1 w-5 h-25"
              onClick={toggleSidebarCollapse}
              type='button'
              data-bs-toggle={isSmall ? "offcanvas" : ""}
              data-bs-target={isSmall ? "#sidebar" : ""}
            >
            { isSmall ? <i className="bi bi-three-dots-vertical"></i> :
            isSidebarCollapsed ? (
              <i className="bi bi-chevron-compact-right"></i>
            ) : (
              <i className="bi bi-chevron-compact-left"></i>
            )}
          </button>
          <ChatArea messages={messages} setMessages={setMessages} chatStarted={chatStarted} setChatStarted={setChatStarted}/>
        </div>
      </div>
    </div>
  );
}

export default App;
