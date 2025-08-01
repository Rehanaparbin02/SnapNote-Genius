// React popup component for Web Highlighter Notes
const { useState, useEffect, useRef } = React;

// Main popup component
function WebHighlighterPopup() {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isHighlightActive, setIsHighlightActive] = useState(false);
  const [isImageActive, setIsImageActive] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadNotes();
    checkHighlightStatus();
    loadSettings();
    getCurrentUrl();
  }, []);

  // Filter notes based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredNotes(notes);
    } else {
      const filtered = notes.filter(note =>
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.domain.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredNotes(filtered);
    }
  }, [notes, searchTerm]);

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Load all notes
  const loadNotes = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getNotes'
      });
      setNotes(response.notes || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check highlight status
  const checkHighlightStatus = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      // Ensure the content script is injected before sending message
      // This is crucial for Manifest V3 as content scripts might not be active on all pages initially
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getHighlightStatus'
      });
      setIsHighlightActive(response.highlightActive || false);
      setIsImageActive(response.imageActive || false);
    } catch (error) {
      console.error('Error checking highlight status:', error);
    }
  };

  // Load settings
  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get(['darkMode']);
      setIsDarkMode(result.darkMode || false);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Get current URL
  const getCurrentUrl = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      setCurrentUrl(tab.url);
    } catch (error) {
      console.error('Error getting current URL:', error);
    }
  };

  // Toggle highlight mode
  const toggleHighlightMode = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleHighlightMode'
      });
      setIsHighlightActive(response.active);
      if (response.active) {
        setIsImageActive(false); // Deactivate image mode
      }
    } catch (error) {
      console.error('Error toggling highlight mode:', error);
    }
  };

  // Toggle image capture mode
  const toggleImageMode = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleImageMode'
      });
      setIsImageActive(response.active);
      if (response.active) {
        setIsHighlightActive(false); // Deactivate highlight mode
      }
    } catch (error) {
      console.error('Error toggling image mode:', error);
    }
  };

  // Toggle dark mode
  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    try {
      await chrome.storage.local.set({ darkMode: newDarkMode });
    } catch (error) {
      console.error('Error saving dark mode setting:', error);
    }
  };

  // Delete note
  const deleteNote = async (noteId) => {
    try {
      await chrome.runtime.sendMessage({
        action: 'deleteNote',
        noteId: noteId
      });
      setNotes(notes.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Start editing note
  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  // Save edited note
  const saveEdit = async (noteId) => {
    try {
      await chrome.runtime.sendMessage({
        action: 'updateNote',
        noteId: noteId,
        content: editContent
      });

      setNotes(notes.map(note =>
        note.id === noteId ? { ...note, content: editContent } : note
      ));
      setEditingNoteId(null);
      setEditContent('');
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  // Export notes
  const exportNotes = () => {
    const dataStr = JSON.stringify(notes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `web-highlighter-notes-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group notes by domain
  const groupedNotes = filteredNotes.reduce((groups, note) => {
    const domain = note.domain;
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(note);
    return groups;
  }, {});

  // Sort domains by note count
  const sortedDomains = Object.keys(groupedNotes).sort((a, b) => {
    return groupedNotes[b].length - groupedNotes[a].length;
  });

  if (loading) {
    return (
      <div className="popup-container">
        <div className="popup-header">
          <h1>Web Highlighter Notes</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      {/* Header */}
      <div className="popup-header">
        <h1>Web Highlighter Notes</h1>
        <p>
          {notes.length} notes saved • {filteredNotes.filter(n => n.type === 'text').length} text • {filteredNotes.filter(n => n.type === 'image').length} images
        </p>
        <div className={`status-indicator ${
          isHighlightActive && isImageActive ? 'multi-active' :
            (isHighlightActive || isImageActive) ? 'active' : 'inactive'
          }`}></div>
      </div>

      {/* Controls */}
      <div className="controls">
        <button
          className={`control-btn highlight-btn ${isHighlightActive ? 'active' : ''}`}
          onClick={toggleHighlightMode}
          title={isHighlightActive ? 'Deactivate text highlighting' : 'Activate text highlighting'}
        >
          {isHighlightActive ? '⏹️ Stop Text' : '🖍️ Text'}
        </button>
        <button
          className={`control-btn image-btn ${isImageActive ? 'active' : ''}`}
          onClick={toggleImageMode}
          title={isImageActive ? 'Deactivate image capture' : 'Activate image capture'}
        >
          {isImageActive ? '⏹️ Stop Img' : '📷 Image'}
        </button>
        <button
          className="control-btn dark-mode-btn"
          onClick={toggleDarkMode}
          title="Toggle dark mode"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <button
          className="control-btn export-btn"
          onClick={exportNotes}
          title="Export notes"
          disabled={notes.length === 0}
        >
          📤
        </button>
      </div>

      {/* Search */}
      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="notes-container">
        {filteredNotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h3>No notes yet</h3>
            <p>
              {notes.length === 0
                ? 'Click the Text or Image button and start capturing content on any webpage to save notes!'
                : 'No notes match your search criteria.'}
            </p>
          </div>
        ) : (
          sortedDomains.map(domain => (
            <div key={domain} className="notes-group">
              <div className="notes-group-header">
                <h3 className="notes-group-title">{domain}</h3>
                <span className="notes-group-count">{groupedNotes[domain].length}</span>
              </div>
              {groupedNotes[domain]
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map(note => (
                  <div key={note.id} className={`note-item ${note.type === 'image' ? 'note-image' : ''}`}>
                    {editingNoteId === note.id ? (
                      <>
                        <textarea
                          className="note-edit-input"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          autoFocus
                        />
                        <div className="note-meta">
                          <span className="note-timestamp">
                            {formatTimestamp(note.timestamp)}
                          </span>
                          <div className="note-actions">
                            <button
                              className="note-action-btn save"
                              onClick={() => saveEdit(note.id)}
                              title="Save changes"
                            >
                              ✅
                            </button>
                            <button
                              className="note-action-btn cancel"
                              onClick={cancelEdit}
                              title="Cancel editing"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {note.type === 'image' && (
                          <div className="note-image-container">
                            {note.imageData ? (
                              <img
                                src={note.imageData}
                                alt={note.imageAlt || 'Captured image'}
                                className="note-image-preview"
                                onClick={() => window.open(note.imageData, '_blank')}
                                title="Click to view full size"
                              />
                            ) : (
                              <div className="note-image-placeholder">
                                <span className="image-icon">🖼️</span>
                                <span className="image-text">Image Reference</span>
                                {note.imageSrc && (
                                  <a
                                    href={note.imageSrc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="image-link"
                                    title="View original image"
                                  >
                                    View Original
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="note-content">
                          <span className={`note-type-indicator ${note.type}`}>
                            {note.type === 'image' ? '📷' : '📝'}
                          </span>
                          {note.content}
                        </div>
                        <div className="note-meta">
                          <span className="note-timestamp">
                            {formatTimestamp(note.timestamp)}
                          </span>
                          <div className="note-actions">
                            <button
                              className="note-action-btn edit"
                              onClick={() => startEditing(note)}
                              title="Edit note"
                            >
                              ✏️
                            </button>
                            <button
                              className="note-action-btn delete"
                              onClick={() => deleteNote(note.id)}
                              title="Delete note"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Render the app
ReactDOM.render(<WebHighlighterPopup />, document.getElementById('popup-root'));