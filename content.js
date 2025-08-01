// Content script for text highlighting and image capturing functionality
let isHighlightModeActive = false;
let isImageModeActive = false;
let highlightOverlay = null;
let imageClickListeners = [];

// Initialize the extension
function initializeExtension() {
  createHighlightOverlay();
  addEventListeners();
}

// Create highlight overlay
function createHighlightOverlay() {
  if (highlightOverlay) return;
  
  highlightOverlay = document.createElement('div');
  highlightOverlay.id = 'web-highlighter-overlay';
  highlightOverlay.className = 'web-highlighter-overlay';
  document.body.appendChild(highlightOverlay);
}

// Add event listeners
function addEventListeners() {
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
  });
  
  // Text selection handling
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);
}

// Toggle highlight mode
function toggleHighlightMode() {
  isHighlightModeActive = !isHighlightModeActive;
  
  // If activating highlight mode, deactivate image mode
  if (isHighlightModeActive && isImageModeActive) {
    isImageModeActive = false;
    removeImageClickListeners();
    document.body.classList.remove('image-mode-active');
  }
  
  if (isHighlightModeActive) {
    document.body.classList.add('highlight-mode-active');
    showNotification('Highlight mode activated! Select text to save notes.');
  } else {
    document.body.classList.remove('highlight-mode-active');
    showNotification('Highlight mode deactivated.');
  }
}

// Toggle image capture mode
function toggleImageMode() {
  isImageModeActive = !isImageModeActive;
  
  // If activating image mode, deactivate highlight mode
  if (isImageModeActive && isHighlightModeActive) {
    isHighlightModeActive = false;
    document.body.classList.remove('highlight-mode-active');
  }
  
  if (isImageModeActive) {
    document.body.classList.add('image-mode-active');
    addImageClickListeners();
    showNotification('Image capture mode activated! Click on images to save them.');
  } else {
    document.body.classList.remove('image-mode-active');
    removeImageClickListeners();
    showNotification('Image capture mode deactivated.');
  }
}

// Handle text selection
function handleTextSelection(event) {
  if (!isHighlightModeActive) return;
  
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText.length > 0) {
    saveHighlightedText(selectedText);
    
    // Visual feedback
    highlightSelectedText(selection);
    
    // Clear selection after a short delay
    setTimeout(() => {
      selection.removeAllRanges();
    }, 500);
  }
}

// Add image click listeners
function addImageClickListeners() {
  const images = document.querySelectorAll('img');
  
  images.forEach(img => {
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
}

// Remove image click listeners
function removeImageClickListeners() {
  imageClickListeners.forEach(({ element, handler }) => {
    element.removeEventListener('click', handler, true);
    element.style.cursor = '';
    element.classList.remove('image-capturable');
  });
  imageClickListeners = [];
}

// Handle image click
async function handleImageClick(imgElement) {
  try {
    showNotification('Capturing image...', 'info');
    
    // Create a canvas to capture the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match image
    canvas.width = imgElement.naturalWidth || imgElement.width;
    canvas.height = imgElement.naturalHeight || imgElement.height;
    
    // Handle CORS issues by creating a new image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      try {
        // Draw image to canvas
        ctx.drawImage(img, 0, 0);
        
        // Convert to base64
        const imageData = canvas.toDataURL('image/png');
        
        // Save image note
        await saveImageNote(imgElement, imageData);
        
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
    showNotification('Error capturing image', 'error');
  }
}

// Save highlighted text
async function saveHighlightedText(text) {
  try {
    const noteData = {
      content: text,
      url: window.location.href,
      title: document.title || window.location.hostname,
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    
    const response = await chrome.runtime.sendMessage({
      action: 'saveNote',
      data: noteData
    });
    
    if (response.success) {
      showNotification('Text note saved successfully!', 'success');
    } else {
      showNotification('Failed to save note: ' + response.error, 'error');
    }
  } catch (error) {
    console.error('Error saving highlighted text:', error);
    showNotification('Error saving note', 'error');
  }
}

// Save image note
async function saveImageNote(imgElement, imageData) {
  try {
    const noteData = {
      content: imgElement.alt || imgElement.title || 'Image from ' + window.location.hostname,
      url: window.location.href,
      title: document.title || window.location.hostname,
      timestamp: new Date().toISOString(),
      type: 'image',
      imageData: imageData, // Base64 image data (if available)
      imageSrc: imgElement.src, // Original source URL
      imageAlt: imgElement.alt || ''
    };
    
    const response = await chrome.runtime.sendMessage({
      action: 'saveNote',
      data: noteData
    });
    
    if (response.success) {
      showNotification('Image note saved successfully!', 'success');
    } else {
      showNotification('Failed to save image: ' + response.error, 'error');
    }
  } catch (error) {
    console.error('Error saving image note:', error);
    showNotification('Error saving image', 'error');
  }
}

// Highlight selected text visually
function highlightSelectedText(selection) {
  if (selection.rangeCount === 0) return;
  
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
}

// Show temporary highlight overlay
function showTemporaryHighlight(range) {
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
}

// Show image captured effect
function showImageCapturedEffect(imgElement) {
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
}

// Show notification
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.web-highlighter-notification');
  existingNotifications.forEach(notif => notif.remove());
  
  const notification = document.createElement('div');
  notification.className = `web-highlighter-notification web-highlighter-notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Handle dynamic content changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // Ensure overlay is still present
      if (!document.getElementById('web-highlighter-overlay')) {
        createHighlightOverlay();
      }
      
      // Add image listeners to new images if image mode is active
      if (isImageModeActive) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const newImages = node.tagName === 'IMG' ? [node] : node.querySelectorAll?.('img') || [];
            newImages.forEach(img => {
              if (!img.classList.contains('image-capturable')) {
                const clickHandler = (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleImageClick(img);
                };
                
                img.addEventListener('click', clickHandler, true);
                img.style.cursor = 'copy';
                img.classList.add('image-capturable');
                
                imageClickListeners.push({
                  element: img,
                  handler: clickHandler
                });
              }
            });
          }
        });
      }
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});