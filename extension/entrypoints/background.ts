export default defineBackground(() => {
  // Open side panel when extension icon is clicked
  chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  });

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.type === 'JSON_DETECTED') {
      // Could show a badge or notification
      chrome.action.setBadgeText({ text: 'JSON' });
      chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
    } else if (message.type === 'JSON_NOT_FOUND') {
      chrome.action.setBadgeText({ text: '' });
    }
  });
});
