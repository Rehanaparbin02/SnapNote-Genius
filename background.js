// ========== Data Management Functions ========== //

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

async function saveNote(noteData) {
    try {
        // Validate data
        validateNoteData(noteData);
        
        const result = await chrome.storage.local.get(['notes', 'settings']);
        const notes = result.notes || [];
        const settings = result.settings || { maxNotes: 10000 };

        // Check storage limits
        if (notes.length >= settings.maxNotes) {
            throw new Error(`Maximum number of notes reached (${settings.maxNotes})`);
        }

        const newNote = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
            content: noteData.content.trim(),
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

        return newNote;
    } catch (error) {
        console.error('Error saving note:', error);
        throw error;
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
        console.error('Error getting notes:', error);
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
        console.error('Error deleting note:', error);
        throw error;
    }
}

async function updateNote(noteId, newContent) {
    try {
        if (!noteId || !newContent) {
            throw new Error('Note ID and content are required');chrome.runtime.onInstalled.addListener(() => {
    console.log('SnapNote Genius extension installed');
    // Initialize default settings
    chrome.storage.local.set({
        settings: {
            darkMode: false,
            autoBackup: true,
            maxNotes: 10000,
            notifications: true
        }
    });
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle-highlight" || command === "toggle-image") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: command === "toggle-highlight" ? "toggleHighlightMode" : "toggleImageMode"
                });
            }
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === 'saveNote') {
            saveNote(request.data)
                .then((result) => sendResponse({ success: true, note: result }))
                .catch((error) => sendResponse({ success: false, error: error.message }));
            return true;
        }

        if (request.action === 'getNotes') {
            getNotes(request.url)
                .then((notes) => sendResponse({ notes }))
                .catch((error) => sendResponse({ notes: [], error: error.message }));
            return true;
        }

        if (request.action === 'deleteNote') {
            deleteNote(request.noteId)
                .then(() => sendResponse({ success: true }))
                .catch((error) => sendResponse({ success: false, error: error.message }));
            return true;
        }

        if (request.action === 'updateNote') {
            updateNote(request.noteId, request.content)
                .then(() => sendResponse({ success: true }))
                .catch((error) => sendResponse({ success: false, error: error.message }));
            return true;
        }

        if (request.action === 'exportNotes') {
            exportNotes(request.format)
                .then((data) => sendResponse({ success: true, data }))
                .catch((error) => sendResponse({ success: false, error: error.message }));
            return true;
        }

        if (request.action === 'getStats') {
            getStats()
                .then((stats) => sendResponse({ success: true, stats }))
                .catch((error) => sendResponse({ success: false, error: error.message }));
            return true;
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ success: false, error: error.message });
    }
});

// ========== Data Management Functions ========== //

async function saveNote(noteData) {
    try {
        const result = await chrome.storage.local.get(['notes']);
        const notes = result.notes || [];

        const newNote = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9), // Better unique ID
            content: noteData.content,
            url: noteData.url,
            title: noteData.title,
            timestamp: noteData.timestamp || new Date().toISOString(),
            domain: new URL(noteData.url).hostname,
            type: noteData.type || 'text',
            imageData: noteData.imageData || null,
            imageSrc: noteData.imageSrc || null,
            imageAlt: noteData.imageAlt || null,
        };

        notes.unshift(newNote); // Add to beginning for chronological order
        await chrome.storage.local.set({ notes });

        return newNote;
    } catch (error) {
        console.error('Error saving note:', error);
        throw error;
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
        console.error('Error getting notes:', error);
        throw error;
    }
}

async function deleteNote(noteId) {
    try {
        const result = await chrome.storage.local.get(['notes']);
        const notes = result.notes || [];
        const filteredNotes = notes.filter(note => note.id !== noteId);
        
        if (filteredNotes.length === notes.length) {
            throw new Error('Note not found');
        }
        
        await chrome.storage.local.set({ notes: filteredNotes });
    } catch (error) {
        console.error('Error deleting note:', error);
        throw error;
    }
}

async function updateNote(noteId, newContent) {
    try {
        const result = await chrome.storage.local.get(['notes']);
        const notes = result.notes || [];
        const noteIndex = notes.findIndex(note => note.id === noteId);

        if (noteIndex === -1) {
            throw new Error('Note not found');
        }

        notes[noteIndex].content = newContent;
        notes[noteIndex].lastModified = new Date().toISOString();
        await chrome.storage.local.set({ notes });
    } catch (error) {
        console.error('Error updating note:', error);
        throw error;
    }
} // End of updateNote function
} // End of try block