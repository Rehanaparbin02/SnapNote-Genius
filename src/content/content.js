// Content script for text highlighting and image capturing functionality
let isHighlightModeActive = false;
let isImageModeActive = false;
let highlightOverlay = null;
let imageClickListeners = [];

// Error Handling and Notification Utility for Content Script
class ErrorHandler {
  static log(error, context = '') {
    console.error(`[WebHighlighter Content Script - ${context}]:`, error);
  }
  static notify(message, type = 'error') {
    showNotification(message, type); // Use existing notification system
  }
}

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
    ErrorHandler.log('Web Highlighter content script initialized', 'Initialization');
  } catch (error) {
    ErrorHandler.log(error, 'initializeExtension');
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
    ErrorHandler.log(error, 'createHighlightOverlay');
  }
}

// Add event listeners
function addEventListeners() {
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleHighlightMode') {
      toggleHighlightMode(request.isActive);
    } else if (request.action === 'toggleImageMode') {
      toggleImageMode(request.isActive);
    } else if (request.action === 'getStatus') {
      sendResponse({ isHighlightActive, isImageModeActive });
    }
  });

  // Listener for mouseup event for text highlighting
  document.addEventListener('mouseup', handleHighlight);
  
  // Clean up on pageunload
  window.addEventListener('beforeunload', () => {
    removeImageClickListeners();
  });
}

// Toggle highlight mode
function toggleHighlightMode(isActive) {
  isHighlightModeActive = isActive;
  if (isActive) {
    document.body.classList.add('highlight-mode-active');
  } else {
    document.body.classList.remove('highlight-mode-active');
  }
  removeImageClickListeners(); // Deactivate image mode if highlighting is enabled
  ErrorHandler.notify(isActive ? 'Highlight mode ON' : 'Highlight mode OFF', 'info');
}

// Handle highlighting of selected text
function handleHighlight() {
  if (!isHighlightModeActive) return;

  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString().trim();
  
  if (selectedText.length > 0) {
    saveNote(selectedText, 'text');
    highlightSelection(range);
  }
}

// Apply visual highlight to the selected text
function highlightSelection(range) {
  const highlightSpan = document.createElement('span');
  highlightSpan.className = 'web-highlighter-highlight';
  try {
    // Check if range is valid before wrapping
    if (range.commonAncestorContainer && range.commonAncestorContainer.nodeType !== Node.DOCUMENT_NODE) {
      range.surroundContents(highlightSpan);
      window.getSelection().removeAllRanges(); // Clear selection
      ErrorHandler.notify('Text note saved!', 'success');
    }
  } catch (e) {
    ErrorHandler.log(e, 'highlightSelection');
    ErrorHandler.notify('Could not highlight. Please try again.', 'error');
  }
}

// Toggle image mode
function toggleImageMode(isActive) {
  isImageModeActive = isActive;
  if (isActive) {
    document.body.classList.add('image-mode-active');
    addImageClickListeners();
  } else {
    document.body.classList.remove('image-mode-active');
    removeImageClickListeners();
  }
  ErrorHandler.notify(isActive ? 'Image capture mode ON' : 'Image capture mode OFF', 'info');
}

// Add click listeners to all images on the page
function addImageClickListeners() {
  removeImageClickListeners(); // Clean up existing listeners first
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    img.classList.add('image-capturable');
    const listener = (event) => handleImageCapture(event, img);
    img.addEventListener('click', listener);
    imageClickListeners.push({ img, listener });
  });
}

// Remove click listeners from images
function removeImageClickListeners() {
  imageClickListeners.forEach(({ img, listener }) => {
    img.removeEventListener('click', listener);
    img.classList.remove('image-capturable');
  });
  imageClickListeners = [];
}

// Handle image capture
function handleImageCapture(event, imgElement) {
  if (!isImageModeActive) return;
  event.preventDefault();
  event.stopPropagation();
  
  let imageUrl = imgElement.src;
  
  // Handle CORS issues by checking if the image can be loaded
  const testImage = new Image();
  testImage.crossOrigin = 'Anonymous';
  testImage.onload = () => {
    saveNote(imageUrl, 'image');
  };
  testImage.onerror = () => {
    // Fallback to saving the URL if we can't capture the image
    saveNote(imageUrl, 'image');
    ErrorHandler.notify('Image note saved, but full preview may not be available due to CORS policy.', 'info');
  };
  testImage.src = imageUrl;
}

// Save note to chrome storage via background script
function saveNote(content, type) {
  const noteData = {
    id: `note-${Date.now()}`,
    content,
    url: window.location.href,
    title: document.title,
    domain: window.location.hostname,
    type,
    timestamp: Date.now(),
  };

  chrome.runtime.sendMessage({ action: 'saveNote', noteData })
    .then(() => {
      ErrorHandler.notify(type === 'text' ? 'Text note saved!' : 'Image note saved!', 'success');
    })
    .catch(error => {
      ErrorHandler.log(error, 'saveNote');
      ErrorHandler.notify('Failed to save note. Please try again.', 'error');
    });
}

// Simple notification system
function showNotification(message, type) {
  let notification = document.getElementById('web-highlighter-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'web-highlighter-notification';
    document.body.appendChild(notification);
  }
  
  notification.textContent = message;
  notification.className = `web-highlighter-notification web-highlighter-notification-${type}`;
  notification.classList.add('fade-in');

  setTimeout(() => {
    notification.classList.remove('fade-in');
    notification.classList.add('fade-out');
    notification.addEventListener('transitionend', () => {
      if (notification.classList.contains('fade-out')) {
        document.body.removeChild(notification);
      }
    }, { once: true });
  }, 2500);
}

// Check if document is ready before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureContentScriptLoaded);
} else {
  ensureContentScriptLoaded();
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
    ErrorHandler.log(error, 'mutationObserver');
  }
});

// Start observing with error handling
try {
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
} catch (error) {
  ErrorHandler.log(error, 'mutationObserver.observe');
}