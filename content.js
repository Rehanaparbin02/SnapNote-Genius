// Content script for text highlighting and image capturing functionality
let isHighlightModeActive = false;
let isImageModeActive = false;
let highlightOverlay = null;
let imageClickListeners = [];

// Ensure content script is only initialized once
function ensureContentScriptLoaded() {
  if (!window.webHighlighterInitialized) {
    initializeExtension();
    window.webHighlighterInitialized = true;
  }
}

// Initialize the extension
function initializeExtension() {
  try {
    createHighlightOverlay();
    addEventListeners();
    console.log('Web Highlighter content script initialized');
  } catch (error) {
    console.error('Error initializing Web Highlighter:', error);
  }
}

// Create highlight overlay
function createHighlightOverlay() {
  if (highlightOverlay || !document.body) return;
  
  try {
    highlightOverlay = document.createElement('div');
    highlightOverlay.id = 'web-highlighter-overlay';
    highlightOverlay.className = 'web-highlighter-overlay';
    document.body.appendChild(highlightOverlay);
  } catch (error) {
    console.error('Error creating highlight overlay:', error);
  }
}

// Add event listeners with error handling
function addEventListeners() {
  try {
    // Listen for messages from popup with error handling
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        if (request.action === 'toggleHighlightMode') {
          toggleHighlightMode();
          sendResponse({ active: isHighlightModeActive });
        }
        
        if (request.action === 'toggleImageMode') {
          toggleImageMode();
          sendResponse({ active: isImageModeActive });
        }
        
        if (request.action === 'getHighlightStatus') {
          sendResponse({ 
            highlightActive: isHighlightModeActive,
            imageActive: isImageModeActive 
          });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ error: error.message });
      }
    });
    
    // Text selection handling
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keyup', handleTextSelection);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
  } catch (error) {
    console.error('Error adding event listeners:', error);
  }
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(event) {
  try {
    // Ctrl+Shift+H for highlight mode
    if (event.ctrlKey && event.shiftKey && event.key === 'H') {
      event.preventDefault();
      toggleHighlightMode();
    }
    
    // Ctrl+Shift+I for image mode
    if (event.ctrlKey && event.shiftKey && event.key === 'I') {
      event.preventDefault();
      toggleImageMode();
    }
    
    // Escape to deactivate both modes
    if (event.key === 'Escape') {
      if (isHighlightModeActive || isImageModeActive) {
        event.preventDefault();
        deactivateAllModes();
      }
    }
  } catch (error) {
    console.error('Error handling keyboard shortcut:', error);
  }
}

// Deactivate all modes
function deactivateAllModes() {
  if (isHighlightModeActive) {
    isHighlightModeActive = false;
    document.body.classList.remove('highlight-mode-active');
  }
  
  if (isImageModeActive) {
    isImageModeActive = false;
    document.body.classList.remove('image-mode-active');
    removeImageClickListeners();
  }
  
  showNotification('All modes deactivated');
}

// Toggle highlight mode with error handling
function toggleHighlightMode() {
  try {
    isHighlightModeActive = !isHighlightModeActive;
    
    // If activating highlight mode, deactivate image mode
    if (isHighlightModeActive && isImageModeActive) {
      isImageModeActive = false;
      removeImageClickListeners();
      document.body.classList.remove('image-mode-active');
    }
    
    if (isHighlightModeActive) {
      document.body.classList.add('highlight-mode-active');
      showNotification('Highlight mode activated! Select text to save notes. (Ctrl+Shift+H to toggle)', 'success');
    } else {
      document.body.classList.remove('highlight-mode-active');
      showNotification('Highlight mode deactivated.');
    }
  } catch (error) {
    console.error('Error toggling highlight mode:', error);
    showNotification('Error toggling highlight mode', 'error');
  }
}

// Toggle image capture mode with error handling
function toggleImageMode() {
  try {
    isImageModeActive = !isImageModeActive;
    
    // If activating image mode, deactivate highlight mode
    if (isImageModeActive && isHighlightModeActive) {
      isHighlightModeActive = false;
      document.body.classList.remove('highlight-mode-active');
    }
    
    if (isImageModeActive) {
      document.body.classList.add('image-mode-active');
      addImageClickListeners();
      showNotification('Image capture mode activated! Click on images to save them. (Ctrl+Shift+I to toggle)', 'success');
    } else {
      document.body.classList.remove('image-mode-active');
      removeImageClickListeners();
      showNotification('Image capture mode deactivated.');
    }
  } catch (error) {
    console.error('Error toggling image mode:', error);
    showNotification('Error toggling image mode', 'error');
  }
}

// Handle text selection with validation
function handleTextSelection(event) {
  if (!isHighlightModeActive) return;
  
  try {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Validate selected text
    if (selectedText.length === 0) return;
    if (selectedText.length > 10000) {
      showNotification('Selected text is too long (max 10,000 characters)', 'error');
      return;
    }
    
    saveHighlightedText(selectedText);
    
    // Visual feedback
    highlightSelectedText(selection);
    
    // Clear selection after a short delay
    setTimeout(() => {
      if (selection.rangeCount > 0) {
        selection.removeAllRanges();
      }
    }, 500);
  } catch (error) {
    console.error('Error handling text selection:', error);
    showNotification('Error saving selected text', 'error');
  }
}

// Add image click listeners with better error handling
function addImageClickListeners() {
  try {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      // Skip if already has listener
      if (img.classList.contains('image-capturable')) return;
      
      const clickHandler = (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleImageClick(img);
      };
      
      img.addEventListener('click', clickHandler, true);
      img.style.cursor = 'copy';
      img.classList.add('image-capturable');
      
      // Store reference for cleanup
      imageClickListeners.push({
        element: img,
        handler: clickHandler
      });
    });
  } catch (error) {
    console.error('Error adding image click listeners:', error);
  }
}

// Remove image click listeners with cleanup
function removeImageClickListeners() {
  try {
    imageClickListeners.forEach(({ element, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener('click', handler, true);
        element.style.cursor = '';
        element.classList.remove('image-capturable');
      }
    });
    imageClickListeners = [];
  } catch (error) {
    console.error('Error removing image click listeners:', error);
  }
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

// Handle image click with better validation
async function handleImageClick(imgElement) {
  try {
    // Validate image element
    if (!imgElement || !imgElement.src) {
      showNotification('Invalid image selected', 'error');
      return;
    }
    
    showNotification('Capturing image...', 'info');
    
    // Create a canvas to capture the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match image (with reasonable limits)
    const maxWidth = 1920;
    const maxHeight = 1080;
    const width = Math.min(imgElement.naturalWidth || imgElement.width, maxWidth);
    const height = Math.min(imgElement.naturalHeight || imgElement.height, maxHeight);
    
    canvas.width = width;
    canvas.height = height;
    
    // Handle CORS issues by creating a new image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      try {
        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with size limit
        const imageData = canvas.toDataURL('image/jpeg', 0.8); // Compress to reduce size
        
        // Check size (approximate)
        if (imageData.length > 5000000) { // ~5MB limit
          showNotification('Image too large, saving reference only', 'warning');
          await saveImageNote(imgElement, null);
        } else {
          await saveImageNote(imgElement, imageData);
        }
        
        // Visual feedback
        showImageCapturedEffect(imgElement);
        
      } catch (error) {
        console.error('Error processing image:', error);
        // Fallback: save without image data
        await saveImageNote(imgElement, null);
      }
    };
    
    img.onerror = async () => {
      console.warn('Could not load image for processing, saving reference only');
      // Save image reference without data
      await saveImageNote(imgElement, null);
    };
    
    // Try to load the image
    if (imgElement.src.startsWith('data:')) {
      // Handle data URLs directly
      await saveImageNote(imgElement, imgElement.src);
      showImageCapturedEffect(imgElement);
    } else {
      img.src = imgElement.src;
    }
    
  } catch (error) {
    console.error('Error capturing image:', error);
    showNotification('Error capturing image: ' + error.message, 'error');
  }
}

// Save highlighted text with validation
async function saveHighlightedText(text) {
  try {
    const noteData = {
      content: text,
      url: window.location.href,
      title: document.title || window.location.hostname,
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    
    // Validate data before sending
    validateNoteData(noteData);
    
    const response = await chrome.runtime.sendMessage({
      action: 'saveNote',
      data: noteData
    });
    
    if (response && response.success) {
      showNotification('Text note saved successfully!', 'success');
    } else {
      const errorMsg = response?.error || 'Unknown error occurred';
      showNotification('Failed to save note: ' + errorMsg, 'error');
    }
  } catch (error) {
    console.error('Error saving highlighted text:', error);
    showNotification('Error saving note: ' + error.message, 'error');
  }
}

// Save image note with validation
async function saveImageNote(imgElement, imageData) {
  try {
    const noteData = {
      content: imgElement.alt || imgElement.title || `Image from ${window.location.hostname}`,
      url: window.location.href,
      title: document.title || window.location.hostname,
      timestamp: new Date().toISOString(),
      type: 'image',
      imageData: imageData, // Base64 image data (if available)
      imageSrc: imgElement.src, // Original source URL
      imageAlt: imgElement.alt || ''
    };
    
    // Validate data before sending
    validateNoteData(noteData);
    
    const response = await chrome.runtime.sendMessage({
      action: 'saveNote',
      data: noteData
    });
    
    if (response && response.success) {
      showNotification('Image note saved successfully!', 'success');
    } else {
      const errorMsg = response?.error || 'Unknown error occurred';
      showNotification('Failed to save image: ' + errorMsg, 'error');
    }
  } catch (error) {
    console.error('Error saving image note:', error);
    showNotification('Error saving image: ' + error.message, 'error');
  }
}

// Highlight selected text visually with error handling
function highlightSelectedText(selection) {
  if (!selection || selection.rangeCount === 0) return;
  
  try {
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'web-highlighter-highlight';
    
    try {
      range.surroundContents(span);
      
      // Remove highlight after animation
      setTimeout(() => {
        if (span.parentNode) {
          const parent = span.parentNode;
          parent.insertBefore(document.createTextNode(span.textContent), span);
          parent.removeChild(span);
          parent.normalize();
        }
      }, 2000);
    } catch (error) {
      // If surroundContents fails, just show a temporary highlight overlay
      showTemporaryHighlight(range);
    }
  } catch (error) {
    console.error('Error highlighting text:', error);
  }
}

// Show temporary highlight overlay
function showTemporaryHighlight(range) {
  try {
    const rect = range.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.className = 'web-highlighter-temp-highlight';
    highlight.style.position = 'fixed';
    highlight.style.top = rect.top + 'px';
    highlight.style.left = rect.left + 'px';
    highlight.style.width = rect.width + 'px';
    highlight.style.height = rect.height + 'px';
    highlight.style.pointerEvents = 'none';
    highlight.style.zIndex = '10000';
    
    document.body.appendChild(highlight);
    
    setTimeout(() => {
      if (highlight.parentNode) {
        highlight.parentNode.removeChild(highlight);
      }
    }, 2000);
  } catch (error) {
    console.error('Error showing temporary highlight:', error);
  }
}

// Show image captured effect
function showImageCapturedEffect(imgElement) {
  try {
    const rect = imgElement.getBoundingClientRect();
    const effect = document.createElement('div');
    effect.className = 'web-highlighter-image-capture-effect';
    effect.style.position = 'fixed';
    effect.style.top = rect.top + 'px';
    effect.style.left = rect.left + 'px';
    effect.style.width = rect.width + 'px';
    effect.style.height = rect.height + 'px';
    effect.style.pointerEvents = 'none';
    effect.style.zIndex = '10000';
    
    document.body.appendChild(effect);
    
    // Remove effect after animation
    setTimeout(() => {
      if (effect.parentNode) {
        effect.parentNode.removeChild(effect);
      }
    }, 1000);
  } catch (error) {
    console.error('Error showing image capture effect:', error);
  }
}

// Show notification with better error handling
function showNotification(message, type = 'info') {
  try {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.web-highlighter-notification');
    existingNotifications.forEach(notif => {
      if (notif.parentNode) {
        notif.remove();
      }
    });
    
    const notification = document.createElement('div');
    notification.className = `web-highlighter-notification web-highlighter-notification-${type}`;
    notification.textContent = message;
    
    // Add close button
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = 'float: right; cursor: pointer; font-weight: bold; margin-left: 10px;';
    closeBtn.onclick = () => {
      if (notification.parentNode) {
        notification.remove();
      }
    };
    notification.appendChild(closeBtn);
    
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add('fade-out');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 4000);
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

// Initialize when DOM is ready with proper error handling
function initWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureContentScriptLoaded);
  } else {
    ensureContentScriptLoaded();
  }
}

// Handle dynamic content changes with performance optimization
const observer = new MutationObserver((mutations) => {
  try {
    let shouldUpdateImages = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Ensure overlay is still present
        if (!document.getElementById('web-highlighter-overlay')) {
          createHighlightOverlay();
        }
        
        // Check if new images were added
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'IMG' || (node.querySelectorAll && node.querySelectorAll('img').length > 0)) {
              shouldUpdateImages = true;
            }
          }
        });
      }
    });
    
    // Batch update images if needed and image mode is active
    if (shouldUpdateImages && isImageModeActive) {
      setTimeout(() => {
        addImageClickListeners();
      }, 100); // Debounce to avoid excessive updates
    }
  } catch (error) {
    console.error('Error in mutation observer:', error);
  }
});

// Start observing with error handling
try {
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
} catch (error) {
  console.error('Error starting mutation observer:', error);
}

// Initialize the extension
initWhenReady();