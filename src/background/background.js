// ========== Data Management Functions ========== //

// Error Handling Utility for Background Script
class ErrorHandler {
  static log(error, context = '') {
    console.error(`[WebHighlighter Background Script - ${context}]:`, error);
  }
  // Background script can send messages to popup.js for notifications
  static notify(message, type = 'error') {
    chrome.runtime.sendMessage({ action: 'showNotification', message, type })
      .catch(e => console.error('Failed to send notification to popup:', e)); // Log if sending fails
  }
}

// Utility to sanitize HTML content to prevent XSS
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str; // Escapes HTML characters
  return temp.innerHTML; // Returns the escaped string
}

// Validate note data
function validateNoteData(noteData) {
  if (!noteData.content || noteData.content.trim() === '') {
    throw new Error('Note content cannot be empty');
  }
  if (!noteData.url || !isValidUrl(noteData.url)) {
    throw new Error('Invalid URL provided');
  }
  if (noteData.content.length > 10000) {
    throw new Error('Note content is too long (max 10,000 characters)');
  }
  if (noteData.type && !['text', 'image'].includes(noteData.type)) {
    throw new Error('Invalid note type');
  }
  return true;
}

// Validate URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

async function cleanupOldNotes() {
  try {
    let result = await chrome.storage.local.get(['notes']);
    let notes = result.notes || [];

    const usage = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES; // Usually 5MB for sync, 10MB for local. Chrome.storage.local is 10MB.

    // If usage exceeds 90% of quota, start cleaning
    if (usage >= quota * 0.9) {
      ErrorHandler.log(`Storage usage (${usage} bytes) is high, cleaning up oldest notes.`, 'cleanupOldNotes');
      ErrorHandler.notify('Storage space is getting low. Deleting older notes.', 'warning');

      const notesToDeleteCount = Math.ceil(notes.length * 0.1); // Delete 10% of notes
      notes = notes.slice(0, notes.length - notesToDeleteCount); // Keep the newest notes

      await chrome.storage.local.set({ notes });
      ErrorHandler.log(`Cleaned up ${notesToDeleteCount} notes. New usage: ${await chrome.storage.local.getBytesInUse()} bytes.`, 'cleanupOldNotes');
    }
  } catch (error) {
    ErrorHandler.log(error, 'cleanupOldNotes');
  }
}

async function checkStorageQuotaAndClean() {
  try {
    const usage = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES;

    if (usage >= quota * 0.9) { // Trigger cleanup if 90% full or more
      await cleanupOldNotes();
    }
  } catch (error) {
    ErrorHandler.log(error, 'checkStorageQuotaAndClean');
  }
}

async function saveNote(noteData) {
  try {
    // Validate data
    validateNoteData(noteData);

    const result = await chrome.storage.local.get(['notes', 'settings']);
    const notes = result.notes || [];
    const settings = result.settings || { maxNotes: 10000 };

    // Sanitize content before saving
    const sanitizedContent = sanitizeHTML(noteData.content.trim());

    // Check storage limits (before adding new note)
    if (notes.length >= settings.maxNotes) {
      throw new Error(`Maximum number of notes reached (${settings.maxNotes})`);
    }

    const newNote = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
      content: sanitizedContent, // Use sanitized content
      url: noteData.url,
      title: noteData.title || 'Untitled',
      timestamp: noteData.timestamp || new Date().toISOString(),
      domain: new URL(noteData.url).hostname,
      type: noteData.type || 'text',
      imageData: noteData.imageData || null,
      imageSrc: noteData.imageSrc || null,
      imageAlt: noteData.imageAlt || null,
      tags: noteData.tags || [],
      category: noteData.category || 'general'
    };

    notes.unshift(newNote); // Add to beginning for chronological order
    await chrome.storage.local.set({ notes });

    // Update statistics
    await updateStats('noteAdded', newNote.type);

    // Check and clean up storage after saving
    await checkStorageQuotaAndClean();

    return newNote;
  } catch (error) {
    ErrorHandler.log(error, 'saveNote');
    throw error; // Re-throw to propagate error to caller
  }
}

async function getNotes(url = null) {
  try {
    const result = await chrome.storage.local.get(['notes']);
    const allNotes = result.notes || [];

    if (url) {
      const domain = new URL(url).hostname;
      return allNotes.filter(note => note.domain === domain);
    }

    return allNotes;
  } catch (error) {
    ErrorHandler.log(error, 'getNotes');
    throw error;
  }
}

async function deleteNote(noteId) {
  try {
    if (!noteId) {
      throw new Error('Note ID is required');
    }
    const result = await chrome.storage.local.get(['notes']);
    const notes = result.notes || [];
    const noteIndex = notes.findIndex(note => note.id === noteId);
    if (noteIndex === -1) {
      throw new Error('Note not found');
    }
    const deletedNote = notes[noteIndex];
    notes.splice(noteIndex, 1);
    await chrome.storage.local.set({ notes });
    // Update statistics
    await updateStats('noteDeleted', deletedNote.type);
    return deletedNote;
  } catch (error) {
    ErrorHandler.log(error, 'deleteNote');
    throw error;
  }
}

async function updateNote(noteId, newContent) {
  try {
    if (!noteId || !newContent) {
      throw new Error('Note ID and content are required');
    }
    const result = await chrome.storage.local.get(['notes']);
    const notes = result.notes || [];
    const noteIndex = notes.findIndex(note => note.id === noteId);

    if (noteIndex === -1) {
      throw new Error('Note not found');
    }

    // Sanitize new content before updating
    notes[noteIndex].content = sanitizeHTML(newContent.trim());
    notes[noteIndex].lastModified = new Date().toISOString();
    await chrome.storage.local.set({ notes });
    return notes[noteIndex];
  } catch (error) {
    ErrorHandler.log(error, 'updateNote');
    throw error;
  }
}

// ========== Statistics Management Functions ========== //
async function updateStats(action, type) {
  try {
    const result = await chrome.storage.local.get(['stats']);
    const stats = result.stats || {
      notesAdded: 0,
      notesDeleted: 0,
      textNotes: 0,
      imageNotes: 0,
      lastUpdated: new Date().toISOString()
    };

    if (action === 'noteAdded') {
      stats.notesAdded++;
      if (type === 'text') stats.textNotes++;
      else if (type === 'image') stats.imageNotes++;
    } else if (action === 'noteDeleted') {
      stats.notesDeleted++;
      if (type === 'text') stats.textNotes = Math.max(0, stats.textNotes - 1);
      else if (type === 'image') stats.imageNotes = Math.max(0, stats.imageNotes - 1);
    }
    stats.lastUpdated = new Date().toISOString();
    await chrome.storage.local.set({ stats });
  } catch (error) {
    ErrorHandler.log(error, 'updateStats');
  }
}

async function getStats() {
  try {
    const result = await chrome.storage.local.get(['stats']);
    return result.stats || {
      notesAdded: 0,
      notesDeleted: 0,
      textNotes: 0,
      imageNotes: 0,
      lastUpdated: null
    };
  } catch (error) {
    ErrorHandler.log(error, 'getStats');
    throw error;
  }
}


// ========== Event Listeners ========== //

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      let response;
      switch (request.action) {
        case 'saveNote':
          response = await saveNote(request.data);
          sendResponse({ success: true, note: response });
          break;
        case 'getNotes':
          response = await getNotes(request.url);
          sendResponse({ success: true, notes: response });
          break;
        case 'deleteNote':
          response = await deleteNote(request.noteId);
          sendResponse({ success: true, note: response });
          break;
        case 'updateNote':
          response = await updateNote(request.noteId, request.content);
          sendResponse({ success: true, note: response });
          break;
        case 'getStats':
          response = await getStats();
          sendResponse({ success: true, stats: response });
          break;
          // Centralized notification request from content script
        case 'showNotification':
          ErrorHandler.notify(request.message, request.type);
          sendResponse({ success: true });
          break;
        default:
          ErrorHandler.log(`Unknown action: ${request.action}`, 'onMessage');
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      ErrorHandler.log(error, `onMessage - Action: ${request.action}`);
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true; // Indicates an asynchronous response
});

// On installation, set up default settings
chrome.runtime.onInstalled.addListener(() => {
  ErrorHandler.log('SnapNote Genius extension installed', 'onInstalled');
  // Initialize default settings
  chrome.storage.local.set({
    settings: {
      darkMode: false,
      autoBackup: true,
      maxNotes: 10000,
      notifications: true
    },
    stats: {
      notesAdded: 0,
      notesDeleted: 0,
      textNotes: 0,
      imageNotes: 0,
      lastUpdated: new Date().toISOString()
    }
  }).catch(error => ErrorHandler.log(error, 'onInstalled.setSettings'));
});

// Listen for keyboard commands defined in manifest.json
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      ErrorHandler.log('No active tab found for command.', 'chrome.commands.onCommand');
      return;
    }

    // Ensure content script is ready before sending command
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
    } catch (error) {
      // Content script not ready, inject it
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // Give it a moment to load
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (command === 'toggle-highlight') {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleHighlightMode' });
      ErrorHandler.log('Toggle highlight command executed.', 'chrome.commands.onCommand');
    } else if (command === 'toggle-image') {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleImageMode' });
      ErrorHandler.log('Toggle image command executed.', 'chrome.commands.onCommand');
    }
  } catch (error) {
    ErrorHandler.log(error, 'chrome.commands.onCommand');
  }
});