import React, { useState } from 'react';

function UploadModal({ handleSave }) {
  const [files, setFiles] = useState([]);
  const [metadata, setMetadata] = useState([{ key: '', value: '' }]);
  const [uploadType, setUploadType] = useState('files'); // 'files' or 'folder'

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]); // Append new files to the existing list
  };

  const handleMetadataChange = (index, field, value) => {
    const newMetadata = [...metadata];
    newMetadata[index][field] = value;
    setMetadata(newMetadata);
  };

  const addMetadataField = () => {
    setMetadata([...metadata, { key: '', value: '' }]);
  };

  const handleSaveClick = () => {
    handleSave(files, metadata); // Pass files instead of filePaths
    setFiles([]); // Clear files after save
    setMetadata([{ key: '', value: '' }]);
  };

  return (
    <div className="modal fade" id="uploadModal" tabIndex="-1" role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Upload Files</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <ul className="nav nav-tabs" id="uploadTab" role="tablist">
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${uploadType === 'files' ? 'active' : ''}`}
                  id="files-tab"
                  data-bs-toggle="tab"
                  type="button"
                  role="tab"
                  onClick={() => setUploadType('files')}
                >
                  Files
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${uploadType === 'folder' ? 'active' : ''}`}
                  id="folder-tab"
                  data-bs-toggle="tab"
                  type="button"
                  role="tab"
                  onClick={() => setUploadType('folder')}
                >
                  Folder
                </button>
              </li>
            </ul>
            <div className="tab-content mt-3">
              {uploadType === 'files' && (
                <div className="mb-3">
                  <label htmlFor="file-input" className="form-label">Select Files</label>
                  <input
                    type="file"
                    id="file-input"
                    className="form-control"
                    onChange={handleFileChange}
                    multiple
                  />
                </div>
              )}
              {uploadType === 'folder' && (
                <div className="mb-3">
                  <label htmlFor="folder-input" className="form-label">Select Folder</label>
                  <input
                    type="file"
                    id="folder-input"
                    className="form-control"
                    webkitdirectory=""
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </div>
            <p>
              No. of selected files: {files.length}
            </p>
            <div>
              <h6>Metadata</h6>
              {metadata.map((data, index) => (
                <div key={index} className="d-flex mb-2">
                  <input
                    type="text"
                    className="form-control me-2"
                    placeholder="Key"
                    value={data.key}
                    onChange={(e) => handleMetadataChange(index, 'key', e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Value"
                    value={data.value}
                    onChange={(e) => handleMetadataChange(index, 'value', e.target.value)}
                  />
                </div>
              ))}
              <button className="btn btn-outline-dark mt-2" onClick={addMetadataField} disabled={!metadata[metadata.length - 1].key || !metadata[metadata.length - 1].value}>
                + Add Metadata
              </button>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" className="btn btn-dark" onClick={handleSaveClick} data-bs-dismiss="modal" disabled={files.length === 0}>Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadModal;
