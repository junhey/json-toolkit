export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    // Detect if current page is displaying JSON
    function detectJson(): void {
      const body = document.body;
      if (!body) return;

      const text = body.innerText?.trim() || '';
      // Check if the page content looks like JSON
      if (text.length > 0 && (text.startsWith('{') || text.startsWith('['))) {
        try {
          JSON.parse(text);
          chrome.runtime.sendMessage({ type: 'JSON_DETECTED', data: text.substring(0, 10000) });
        } catch {
          chrome.runtime.sendMessage({ type: 'JSON_NOT_FOUND' });
        }
      } else {
        chrome.runtime.sendMessage({ type: 'JSON_NOT_FOUND' });
      }
    }

    // Run detection after a short delay
    setTimeout(detectJson, 500);

    // Re-detect on URL changes (SPA navigation)
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(detectJson, 500);
      }
    }).observe(document, { subtree: true, childList: true });
  },
});
