chrome.runtime.onInstalled.addListener(() => {
    console.log('The extension is now installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveNote') {
        saveNote(request.data)
            .then(() => sendResponse({ success: true }))
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
        deleteNote(request.id)
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'updateNote') {
        updateNote(request.id, request.content)
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

// ========== Data Management Functions ========== //

async function saveNote(noteData) {
    try {
        const result = await chrome.storage.local.get(['notes']);
        const notes = result.notes || [];

        const newNote = {
            id: Date.now().toString(),
            content: noteData.content,
            url: noteData.url,
            title: noteData.title,
            timestamp: new Date().toISOString(),
            domain: new URL(noteData.url).hostname,
            type: noteData.type || 'text',
            imageData: noteData.imageData || null,
            imageSrc: noteData.imageSrc || null,
            imageAlt: noteData.imageAlt || null,
        };

        notes.push(newNote);
        await chrome.storage.local.set({ notes });

        const domainKey = `notes_${newNote.domain}`;
        const domainResult = await chrome.storage.local.get([domainKey]);
        const domainNotes = domainResult[domainKey] || [];
        domainNotes.push(newNote);
        await chrome.storage.local.set({ [domainKey]: domainNotes });

        return newNote;
    } catch (error) {
        console.error('Error saving note:', error);
        throw error;
    }
}

async function getNotes(url = null) {
    try {
        if (url) {
            const domain = new URL(url).hostname;
            const domainKey = `notes_${domain}`;
            const result = await chrome.storage.local.get([domainKey]);
            return result[domainKey] || [];
        } else {
            const result = await chrome.storage.local.get(['notes']);
            return result.notes || [];
        }
    } catch (error) {
        console.error('Error getting notes:', error);
        throw error;
    }
}

async function deleteNote(noteId) {
    try {
        const result = await chrome.storage.local.get(['notes']);
        const notes = result.notes || [];
        const noteIndex = notes.findIndex(note => note.id === noteId);

        if (noteIndex !== -1) {
            const note = notes[noteIndex];
            notes.splice(noteIndex, 1);
            await chrome.storage.local.set({ notes });

            const domainKey = `notes_${note.domain}`;
            const domainResult = await chrome.storage.local.get([domainKey]);
            const domainNotes = domainResult[domainKey] || [];
            const domainIndex = domainNotes.findIndex(n => n.id === noteId);
            if (domainIndex !== -1) {
                domainNotes.splice(domainIndex, 1);
                await chrome.storage.local.set({ [domainKey]: domainNotes });
            }
        }
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

        if (noteIndex !== -1) {
            notes[noteIndex].content = newContent;
            notes[noteIndex].lastModified = new Date().toISOString();
            await chrome.storage.local.set({ notes });

            const note = notes[noteIndex];
            const domainKey = `notes_${note.domain}`;
            const domainResult = await chrome.storage.local.get([domainKey]);
            const domainNotes = domainResult[domainKey] || [];
            const domainIndex = domainNotes.findIndex(n => n.id === noteId);
            if (domainIndex !== -1) {
                domainNotes[domainIndex] = note;
                await chrome.storage.local.set({ [domainKey]: domainNotes });
            }
        }
    } catch (error) {
        console.error('Error updating note:', error);
        throw error;
    }
}
