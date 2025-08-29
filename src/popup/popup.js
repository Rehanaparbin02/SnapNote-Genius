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
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  // Handle URL change
  useEffect(() => {
    if (currentUrl) {
      loadNotes();
    }
  }, [currentUrl]);

  // Get current URL
  const getCurrentUrl = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      setCurrentUrl(tab.url || '');
    } catch (e) {
      console.error('Failed to get current tab URL:', e);
      setCurrentUrl('');
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Load notes from storage
  const loadNotes = async () => {
    setLoading(true);
    try {
      const result = await chrome.storage.local.get('notes');
      const storedNotes = result.notes || [];
      const currentDomain = new URL(currentUrl).hostname;
      const filteredByDomain = storedNotes.filter(
        (note) => new URL(note.url).hostname === currentDomain
      );
      setNotes(filteredByDomain);
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  // Save notes to storage
  const saveNotes = async (newNotes) => {
    try {
      await chrome.storage.local.set({ notes: newNotes });
      setNotes(newNotes);
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  // Check the status of highlight and image modes from the content script
  const checkHighlightStatus = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
        if (response) {
          setIsHighlightActive(response.isHighlightActive);
          setIsImageActive(response.isImageActive);
        }
      }
    } catch (e) {
      console.warn("Could not check content script status. It might not be injected yet.");
    }
  };

  // Load dark mode setting
  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get('settings');
      if (result.settings && result.settings.isDarkMode !== undefined) {
        setIsDarkMode(result.settings.isDarkMode);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Toggle dark mode setting and save to storage
  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      const result = await chrome.storage.local.get('settings');
      const settings = result.settings || {};
      settings.isDarkMode = newMode;
      await chrome.storage.local.set({ settings });
    } catch (error) {
      console.error('Error saving dark mode setting:', error);
    }
  };

  // Toggle highlight mode
  const toggleHighlightMode = async () => {
    setIsHighlightActive(!isHighlightActive);
    setIsImageActive(false);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleHighlightMode',
        isActive: !isHighlightActive,
      });
    } catch (error) {
      console.error('Failed to send toggle highlight message:', error);
    }
  };

  // Toggle image mode
  const toggleImageMode = async () => {
    setIsImageActive(!isImageActive);
    setIsHighlightActive(false);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleImageMode',
        isActive: !isImageActive,
      });
    } catch (error) {
      console.error('Failed to send toggle image message:', error);
    }
  };

  // Delete a note
  const deleteNote = async (idToDelete) => {
    const allNotes = await chrome.storage.local.get('notes');
    const updatedNotes = (allNotes.notes || []).filter(note => note.id !== idToDelete);
    await saveNotes(updatedNotes);
    loadNotes(); // Reload notes for the current domain
  };

  // Start editing a note
  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  // Save edited note
  const saveEdit = async (idToEdit) => {
    const allNotes = await chrome.storage.local.get('notes');
    const updatedNotes = (allNotes.notes || []).map(note =>
      note.id === idToEdit ? { ...note, content: editContent, timestamp: Date.now() } : note
    );
    await saveNotes(updatedNotes);
    cancelEditing();
    loadNotes(); // Reload notes for the current domain
  };

  // Group notes by domain
  const groupedNotes = filteredNotes.reduce((groups, note) => {
    const domain = new URL(note.url).hostname;
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(note);
    return groups;
  }, {});

  return (
    <div className="popup-container">
      <div className="popup-header">
        <h1>Web Highlighter</h1>
        <p>Notes for {new URL(currentUrl).hostname}</p>
        <div className="header-actions">
          <button className="theme-toggle-btn" onClick={toggleDarkMode} title="Toggle Dark/Light Mode">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      <div className="controls">
        <button
          className={`control-btn highlight-btn ${isHighlightActive ? 'active' : ''}`}
          onClick={toggleHighlightMode}
        >
          {isHighlightActive ? '⏹️ Stop' : '✏️ Highlight'}
        </button>
        <button
          className={`control-btn image-btn ${isImageActive ? 'active' : ''}`}
          onClick={toggleImageMode}
        >
          {isImageActive ? '⏹️ Stop' : '📷 Image'}
        </button>
      </div>
      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="notes-container">
        {loading ? (
          <div className="loading-spinner"></div>
        ) : filteredNotes.length === 0 ? (
          <p className="empty-state">No notes for this page yet. Start highlighting!</p>
        ) : (
          Object.keys(groupedNotes).map((domain) => (
            <div key={domain} className="notes-group">
              <h3 className="notes-group-header">
                {domain}
              </h3>
              {groupedNotes[domain]
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((note) => (
                  <div key={note.id} className="note-item">
                    {editingNoteId === note.id ? (
                      <div className="edit-form">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows="4"
                        ></textarea>
                        <div className="edit-actions">
                          <button onClick={() => saveEdit(note.id)} className="save-btn">
                            Save
                          </button>
                          <button onClick={cancelEditing} className="cancel-btn">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {note.type === 'image' && (
                          <div className="note-image-container">
                            <img src={note.content} alt="Captured" className="note-image" />
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