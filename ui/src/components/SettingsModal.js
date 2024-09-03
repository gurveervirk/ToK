import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import CustomOptionForPrompts from './CustomOptionForPrompts';
import customStyles from './customStyles';

function SettingsModal() {
  const [settings, setSettings] = useState({
    chunk_size: 1024,
    chunk_overlap: 20,
    temperature: 0.75,
    context_window: 2048,
    token_limit: 1024,
  });
  const chatModeOptions = ["condense_plus_context", "condense_question", "context", "react"];
  const [customPromptsLLM, setCustomPromptsLLM] = useState([{ label: 'default_prompt', value: '' }]);
  const [customPromptsChat, setCustomPromptsChat] = useState([{ label: 'default_prompt', value: "You are a chatbot, who needs to answer questions, preferably using the provided context.\nHere are the relevant documents for the context:\n{context_str}\nInstruction: Use the previous chat history, or the context above, to interact and help the user." }]);
  const [selectedTab, setSelectedTab] = useState('settings');
  const [selectedSubTab, setSelectedSubTab] = useState('Connection');
  const [selectedSubSubTab, setSelectedSubSubTab] = useState('LLM');
  const [newPromptLLM, setNewPromptLLM] = useState({ label: '', value: '' });
  const [newPromptChat, setNewPromptChat] = useState({ label: '', value: '' });
  const [selectedPromptLLM, setSelectedPromptLLM] = useState(null);
  const [selectedPromptChat, setSelectedPromptChat] = useState(null);
  const [defaultPrompt, setDefaultPrompt] = useState({ LLM: null, Chat: null });

  // Fetch settings and prompts on mount
  useEffect(() => {
    async function fetchSettingsAndPrompts() {
      try {
        const settingsResponse = await fetch('http://127.0.0.1:5000/api/settings');
        const settingsData = await settingsResponse.json();
        setSettings(settingsData);

        const promptsResponse = await fetch('http://127.0.0.1:5000/api/prompts');
        const promptsData = await promptsResponse.json();
        setCustomPromptsLLM(promptsData.prompts.LLM.prompts);
        setCustomPromptsChat(promptsData.prompts["Chat Engine"].prompts);
        setDefaultPrompt({ LLM: promptsData.defaults.LLM, Chat: promptsData.defaults["Chat Engine"] });
        setSelectedPromptChat(promptsData.selectedChatEnginePrompt);
        setSelectedPromptLLM(promptsData.selectedLLMPrompt);

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchSettingsAndPrompts();
  }, []);

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: parseFloat(value),
    });
  };

  const handleNewPromptChange = (e) => {
    const { name, value } = e.target;
    if (selectedSubSubTab === 'LLM') {
      setNewPromptLLM({
        ...newPromptLLM,
        [name]: value,
      });
    } else {
      setNewPromptChat({
        ...newPromptChat,
        [name]: value,
      });
    }
  };

  const addOrUpdatePrompt = () => {
    if (selectedSubSubTab === 'LLM') {
      const existingPromptIndex = customPromptsLLM.findIndex(prompt => prompt.label === newPromptLLM.label);
      if (existingPromptIndex !== -1) {
        const updatedPrompts = [...customPromptsLLM];
        updatedPrompts[existingPromptIndex] = newPromptLLM;
        setCustomPromptsLLM(updatedPrompts);
      } else {
        setCustomPromptsLLM([...customPromptsLLM, newPromptLLM]);
      }
      setNewPromptLLM({ label: '', value: '' });
    } else {
      const existingPromptIndex = customPromptsChat.findIndex(prompt => prompt.label === newPromptChat.label);
      if (existingPromptIndex !== -1) {
        const updatedPrompts = [...customPromptsChat];
        updatedPrompts[existingPromptIndex] = newPromptChat;
        setCustomPromptsChat(updatedPrompts);
      } else {
        setCustomPromptsChat([...customPromptsChat, newPromptChat]);
      }
      setNewPromptChat({ label: '', value: '' });
    }
  };

  const setAsDefaultPrompt = () => {
    if (selectedSubSubTab === 'LLM') {
      setDefaultPrompt({
        ...defaultPrompt,
        LLM: customPromptsLLM.find((prompt) => prompt.label === selectedPromptLLM.label),
      });
    } else {
      setDefaultPrompt({
        ...defaultPrompt,
        Chat: customPromptsChat.find((prompt) => prompt.label === selectedPromptChat.label),
      });
    }
  };

  const saveSettings = async () => {
    try {
      await fetch('http://127.0.0.1:5000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const savePrompts = async () => {
    try {
      await fetch('http://127.0.0.1:5000/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ LLM: customPromptsLLM, Chat: customPromptsChat, defaults: defaultPrompt, selectedChatEnginePrompt: selectedPromptChat, selectedLLMPrompt: selectedPromptLLM }),
      });
      alert('Prompts saved successfully!');
    } catch (error) {
      console.error('Error saving prompts:', error);
    }
  };

  const handleDelete = async (data) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${data.label}"?`);
    if (confirmed) {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/delete_prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: data.label, type: selectedSubSubTab }),
        });
        if (!response.ok) {
          throw new Error('Failed to delete prompt');
        }
        if (selectedSubSubTab === 'LLM') {
          setCustomPromptsLLM(customPromptsLLM.filter((prompt) => prompt.label !== data.label));
        } else {
          setCustomPromptsChat(customPromptsChat.filter((prompt) => prompt.label !== data.label));
        }
      } catch (error) {
        console.error('Error deleting prompt:', error);
      }
    }
  };

  const handleTemplateSelect = async (data) => {
    try {
      if (selectedSubSubTab === 'LLM') {
        setNewPromptLLM(data);
      } else {
        setNewPromptChat(data);
      }
    } catch (error) {
      console.error('Error selecting prompt:', error);
    }
  };

  return (
    <div className="modal fade" id="settingsModal" tabIndex="-1" role="dialog">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Settings</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <ul className="nav nav-tabs" id="settingsTabs" role="tablist">
              <li className="nav-item">
                <button
                  className={`nav-link ${selectedTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setSelectedTab('settings')}
                >
                  Settings
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${selectedTab === 'customPrompts' ? 'active' : ''}`}
                  onClick={() => setSelectedTab('customPrompts')}
                >
                  Custom Prompts
                </button>
              </li>
            </ul>

            <div className="tab-content mt-3">
              {selectedTab === 'settings' && (
                <div className="tab-content">
                  <ul className="nav nav-tabs" id="subTabs" role="tablist">
                    <li className="nav-item">
                      <button
                        className={`nav-link ${selectedSubTab === 'Connection' ? 'active' : ''}`}
                        onClick={() => setSelectedSubTab('Connection')}
                      >
                        Connection Settings
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        className={`nav-link ${selectedSubTab === 'Other' ? 'active' : ''}`}
                        onClick={() => setSelectedSubTab('Other')}
                      >
                        Other Settings
                      </button>
                    </li>
                  </ul>

                  <div className="tab-content mt-3">
                    {selectedSubTab === 'Connection' && (
                      <div className="tab-pane fade show active">
                        {/* Connection Settings */}
                        <div className="mb-3">
                          <label htmlFor="database" className="form-label">Database</label>
                          <input
                            type="text"
                            className="form-control"
                            id="database"
                            name="database"
                            value={settings.database}
                            onChange={handleSettingsChange}
                            placeholder="Enter database"
                          />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="password" className="form-label">Password</label>
                          <input
                            type="password"
                            className="form-control"
                            id="password"
                            name="password"
                            value={settings.password}
                            onChange={handleSettingsChange}
                            placeholder="Enter password"
                          />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="uri" className="form-label">URI</label>
                          <input
                            type="text"
                            className="form-control"
                            id="uri"
                            name="uri"
                            value={settings.uri}
                            onChange={handleSettingsChange}
                            placeholder="Enter URI"
                          />
                        </div>
                      </div>
                    )}

                    {selectedSubTab === 'Other' && (
                      <div className="tab-pane fade show active">
                        {/* Other Settings */}
                        <div className="mb-3">
                          <label className="form-label">Chat Mode</label>
                          <Select
                            defaultValue={{ label: settings["chat_mode"], value: settings["chat_mode"] }}
                            value={{ label: settings["chat_mode"], value: settings["chat_mode"] }}
                            onChange={(value) => setSettings({ ...settings, chat_mode: value.value })}
                            styles={customStyles}
                            options={chatModeOptions.map(c => ({ label: c, value: c }))}
                          />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="chunk_size" className="form-label">Chunk Size</label>
                          <input
                            type="range"
                            className="form-range"
                            id="chunk_size"
                            name="chunk_size"
                            min="512"
                            max="4096"
                            step="1"
                            value={settings.chunk_size}
                            onChange={handleSettingsChange}
                          />
                          <small className="form-text text-muted">Value: {settings.chunk_size}</small>
                        </div>
                        <div className="mb-3">
                          <label htmlFor="chunk_overlap" className="form-label">Chunk Overlap</label>
                          <input
                            type="range"
                            className="form-range"
                            id="chunk_overlap"
                            name="chunk_overlap"
                            min="0"
                            max="1024"
                            step="1"
                            value={settings.chunk_overlap}
                            onChange={handleSettingsChange}
                          />
                          <small className="form-text text-muted">Value: {settings.chunk_overlap}</small>
                        </div>
                        <div className="mb-3">
                          <label htmlFor="temperature" className="form-label">Temperature</label>
                          <input
                            type="range"
                            className="form-range"
                            id="temperature"
                            name="temperature"
                            min="0"
                            max="1"
                            step="0.05"
                            value={settings.temperature}
                            onChange={handleSettingsChange}
                          />
                          <small className="form-text text-muted">Value: {settings.temperature}</small>
                        </div>
                        <div className="mb-3">
                          <label htmlFor="context_window" className="form-label">Context Window</label>
                          <input
                            type="range"
                            className="form-range"
                            id="context_window"
                            name="context_window"
                            min="512"
                            max="4096"
                            step="1"
                            value={settings.context_window}
                            onChange={handleSettingsChange}
                          />
                          <small className="form-text text-muted">Value: {settings.context_window}</small>
                        </div>
                        <div className="mb-3">
                          <label htmlFor="token_limit" className="form-label">Token Limit</label>
                          <input
                            type="range"
                            className="form-range"
                            id="token_limit"
                            name="token_limit"
                            min="128"
                            max="4096"
                            step="1"
                            value={settings.token_limit}
                            onChange={handleSettingsChange}
                          />
                          <small className="form-text text-muted">Value: {settings.token_limit}</small>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedTab === 'customPrompts' && (
                <div className="tab-pane fade show active">
                  <ul className="nav nav-tabs" id="subSubTabs" role="tablist">
                    <li className="nav-item">
                      <button
                        className={`nav-link ${selectedSubSubTab === 'LLM' ? 'active' : ''}`}
                        onClick={() => setSelectedSubSubTab('LLM')}
                      >
                        LLM
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        className={`nav-link ${selectedSubSubTab === 'Chat' ? 'active' : ''}`}
                        onClick={() => setSelectedSubSubTab('Chat')}
                      >
                        Chat Engine
                      </button>
                    </li>
                  </ul>

                  <div className="tab-content mt-3">
                    {selectedSubSubTab === 'LLM' && (
                      <div className="tab-pane fade show active">
                        {/* LLM Prompts */}
                        <div className="mb-3">
                          <label htmlFor="prompt_name_llm" className="form-label">Prompt Name</label>
                          <input
                            type="text"
                            className="form-control"
                            id="prompt_name_llm"
                            name="label"
                            value={newPromptLLM.label}
                            onChange={handleNewPromptChange}
                            placeholder="Enter prompt name"
                          />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="prompt_text_llm" className="form-label">Prompt Text</label>
                          <textarea
                            className="form-control"
                            id="prompt_text_llm"
                            name="value"
                            value={newPromptLLM.value}
                            onChange={handleNewPromptChange}
                            rows="3"
                            placeholder="Enter prompt text"
                          ></textarea>
                        </div>
                        <button className="btn btn-outline-dark mb-3" onClick={addOrUpdatePrompt} disabled={!newPromptLLM.label || !newPromptLLM.value}>Add or Update Prompt</button>

                        <div className="mb-3">
                          <label className="form-label">Select Prompt for Session</label>
                          <Select
                            defaultValue={selectedPromptLLM}
                            value={selectedPromptLLM}
                            onChange={setSelectedPromptLLM}
                            styles={customStyles}
                            options={customPromptsLLM}
                            components={{ Option: (props) => <CustomOptionForPrompts {...props} handleDelete={handleDelete} handleTemplateSelect={handleTemplateSelect} isDefault={customPromptsLLM.indexOf(props) === defaultPrompt.LLM || props.label === "default_prompt"} isSelected={props === selectedPromptLLM} /> }}
                          />
                        </div>
                        {selectedPromptLLM && (
                          <button className="btn btn-dark" onClick={setAsDefaultPrompt}>Set as Default</button>
                        )}
                      </div>
                    )}

                    {selectedSubSubTab === 'Chat' && (
                      <div className="tab-pane fade show active">
                        {/* Chat Engine Prompts */}
                        <div className="mb-3">
                          <label htmlFor="prompt_name_chat" className="form-label">Prompt Name</label>
                          <input
                            type="text"
                            className="form-control"
                            id="prompt_name_chat"
                            name="label"
                            value={newPromptChat.label}
                            onChange={handleNewPromptChange}
                            placeholder="Enter prompt name"
                          />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="prompt_text_chat" className="form-label">Prompt Text</label>
                          <textarea
                            className="form-control"
                            id="prompt_text_chat"
                            name="value"
                            value={newPromptChat.value}
                            onChange={handleNewPromptChange}
                            rows="3"
                            placeholder="Enter prompt text"
                          ></textarea>
                        </div>
                        <button className="btn btn-outline-dark mb-3" onClick={addOrUpdatePrompt} disabled={!newPromptChat.label || !newPromptChat.value}>Add or Update Prompt</button>

                        <div className="mb-3">
                          <label className="form-label">Select Prompt for Session</label>
                          <Select
                            defaultValue={selectedPromptChat}
                            value={selectedPromptChat}
                            onChange={setSelectedPromptChat}
                            styles={customStyles}
                            options={customPromptsChat}
                            components={{ Option: (props) => <CustomOptionForPrompts {...props} handleDelete={handleDelete} handleTemplateSelect={handleTemplateSelect} isDefault={customPromptsChat.indexOf(props) === defaultPrompt.Chat || props.label === "default_prompt"} isSelected={props === selectedPromptChat}/> }}
                          />
                        </div>
                        {selectedPromptChat && (
                          <button className="btn btn-dark" onClick={setAsDefaultPrompt}>Set as Default</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" className="btn btn-dark" onClick={saveSettings}>Save Settings</button>
            {selectedTab === 'customPrompts' && (
              <button type="button" className="btn btn-dark" onClick={savePrompts}>Save Prompts</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
