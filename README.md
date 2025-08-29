# Web Highlighter Notes - Chrome Extension

A powerful Chrome extension that allows you to take notes by simply highlighting text on any webpage. Built with React and vanilla JavaScript.

## Features

### Core Features
- **Text Highlighting**: Activate highlight mode and select any text on a webpage to instantly save it as a note
- **Image Capture**: Activate image mode and click on any image to capture and save it as a visual note
- **Auto-save**: Notes are automatically saved with timestamps and webpage context
- **Smart Organization**: Notes are grouped by website domain for easy navigation
- **Real-time Search**: Quickly find notes using the built-in search functionality
- **Edit & Delete**: Modify or remove notes directly from the popup interface

### Advanced Features
- **Mixed Content Types**: Seamlessly capture both text and images in the same workflow
- **Visual Image Preview**: See captured images directly in the notes interface
- **Image Fallback**: Graceful handling of CORS-protected images with reference links
- **Dark Mode**: Toggle between light and dark themes
- **Export Notes**: Export all notes as JSON for backup or external use
- **Visual Feedback**: Smooth animations and notifications for user actions
- **Responsive Design**: Works seamlessly on different screen sizes
- **Cross-site Compatibility**: Works on all websites (subject to browser security policies)

## Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Download/Clone the Extension Files**
   - Create a new folder for your extension (e.g., `web-highlighter-notes`)
   - Save all the provided files in this folder with their respective names:
     - `manifest.json`
     - `background.js`
     - `content.js`
     - `content.css`
     - `popup.html`
     - `popup.js`
     - `popup.css`

2. **Create Icons Folder** (Optional but recommended)
   - Create an `icons` folder in your extension directory
   - Add icon files: `icon16.png`, `icon48.png`, `icon128.png`
   - You can use any 16x16, 48x48, and 128x128 pixel PNG images

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select your extension folder
   - The extension should now appear in your extensions list and toolbar

### Method 2: Create Chrome Web Store Package

1. Follow steps 1-2 from Method 1
2. Zip all extension files
3. Upload to Chrome Web Store Developer Dashboard (requires developer account)

## File Structure

```
web-highlighter-notes/
├── public/                     # Static assets that don't need compilation
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── src/                        # All source code (JS, CSS, HTML, etc.)
│   ├── background/
│   │   └── background.js       # Service worker for background tasks
│   ├── content/
│   │   ├── content.js          # Content script (interacts with webpages)
│   │   └── content.css         # CSS for content script injected elements
│   ├── popup/
│   │   ├── components/         # Reusable React components for the popup
│   │   │   ├── NoteItem.js
│   │   │   └── SearchBar.js
│   │   │   └── ...
│   │   ├── lib/                # Third-party libraries (like React) downloaded locally
│   │   │   └── react/
│   │   │       ├── react.production.min.js
│   │   │       └── react-dom.production.min.js
│   │   ├── popup.js            # Main React app for the popup UI
│   │   └── popup.css           # CSS for the popup UI
│   ├── utils/                  # Helper functions, error handling, constants
│   │   ├── api.js              # Functions for Chrome API interactions
│   │   ├── helpers.js
│   │   └── errorHandler.js
│   └── popup.html              # The main HTML file for the extension popup
├── manifest.json               # The extension manifest file
├── README.md                   # Project README
└── extrafeatures.txt           # Additional features brainstorm
```

## Usage Guide

### Getting Started

1. **Install the Extension**: Follow the installation steps above
2. **Pin to Toolbar**: Right-click the extension icon and select "Pin" for easy access
3. **Navigate to Any Website**: Go to any webpage where you want to take notes

### Taking Notes

#### Text Notes
1. **Activate Text Highlight Mode**:
   - Click the extension icon in your toolbar
   - Click the "🖍️ Text" button in the popup
   - The button will turn red and show "⏹️ Stop Text" when active

2. **Highlight Text**:
   - Your cursor will change to a crosshair
   - Select any text on the webpage by clicking and dragging
   - The selected text will briefly highlight in yellow
   - A notification will confirm the note was saved

#### Image Notes  
1. **Activate Image Capture Mode**:
   - Click the extension icon in your toolbar
   - Click the "📷 Image" button in the popup
   - The button will turn red and show "⏹️ Stop Img" when active

2. **Capture Images**:
   - Your cursor will change to a copy cursor
   - Click on any image on the webpage
   - The image will flash with a blue capture effect
   - A notification will confirm the image was saved

3. **Deactivate When Done**:
   - Click the extension icon again
   - Click the respective "⏹️ Stop" button to deactivate the mode

### Managing Notes

1. **View Notes**:
   - Click the extension icon to open the popup
   - Notes are organized by website domain
   - Text notes show with a 📝 icon, image notes with a 📷 icon
   - Image notes display a preview thumbnail (when available)
   - Each note shows the content, timestamp, and website

2. **Search Notes**:
   - Use the search bar at the top of the popup
   - Search by note content, website title, or domain

3. **Edit Notes**:
   - Click the pencil (✏️) icon next to any note
   - Modify the text in the textarea
   - Click the checkmark (✅) to save or X (❌) to cancel

4. **Delete Notes**:
   - Click the trash (🗑️) icon next to any note
   - The note will be permanently deleted

5. **Export Notes**:
   - Click the "📤 Export" button in the controls
   - A JSON file will be downloaded with all your notes

### Additional Features

- **Dark Mode**: Click the moon (🌙) or sun (☀️) icon to toggle themes
- **Note Organization**: Notes are automatically grouped by website and sorted by date
- **Visual Feedback**: Smooth animations and color-coded notifications keep you informed

## Technical Details

### Architecture

- **Manifest V3**: Uses the latest Chrome extension format
- **React Frontend**: Modern UI built with React 18
- **Chrome Storage API**: Local storage for fast, offline access
- **Content Scripts**: Seamless integration with any webpage
- **Service Worker**: Background processing for data management

### Browser Compatibility

- **Chrome**: Fully supported (Manifest V3)
- **Edge**: Supported (Chromium-based)
- **Firefox**: Requires manifest conversion for compatibility
- **Safari**: Not supported (different extension format)

### Security & Privacy

- **Local Storage Only**: All notes are stored locally on your device
- **No Network Requests**: Extension works completely offline
- **Minimal Permissions**: Only requests necessary permissions for functionality
- **No Data Collection**: No user data is transmitted or collected

## Troubleshooting

### Common Issues

1. **Extension Not Working on Some Sites**:
   - Some sites (like chrome:// pages) restrict extensions
   - Try refreshing the page after installing the extension

2. **Highlighting Not Activating**:
   - Make sure you clicked the "Highlight" button in the popup
   - Check that the button shows "⏹️ Stop" when active
   - Refresh the page if needed

3. **Notes Not Saving**:
   - Check browser console for errors (F12 → Console)
   - Ensure extension has proper permissions
   - Try reloading the extension in chrome://extensions/

4. **Popup Not Opening**:
   - Right-click the extension icon and check if it's enabled
   - Try refreshing the extension or restarting Chrome

### Development

To modify or enhance the extension:

1. Make changes to the relevant files
2. Go to `chrome://extensions/`
3. Click the refresh icon next to your extension
4. Test your changes

## Future Enhancements

Potential features for future versions:
- Cloud sync (Google Drive, Dropbox)
- Note categories and tags
- Markdown support
- PDF export
- Collaborative notes
- Mobile app companion

## License

This project is open source. Feel free to modify and distribute according to your needs.

## Support

For issues, questions, or contributions:
1. Check the troubleshooting section above
2. Review the code comments for technical details
3. Test in a clean Chrome profile to isolate issues

---

**Happy note-taking! 📝✨**