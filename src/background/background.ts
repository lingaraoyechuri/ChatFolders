// src/background/background.ts
chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Assistant extension installed");
});

// Listen for tab updates to detect AI platforms
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const url = tab.url.toLowerCase();
    console.log("url", url);

    // Check if the page is one of our supported AI platforms
    if (
      url.includes("perplexity.ai") ||
      url.includes("chatgpt.com") ||
      url.includes("chat.deepseek.com") ||
      url.includes("gemini.google.com")
    ) {
      // The page is a supported AI platform and has finished loading
      chrome.tabs.sendMessage(tabId, {
        action: "aiPlatformDetected",
        platform: url.includes("perplexity.ai")
          ? "perplexity"
          : url.includes("chatgpt.com")
          ? "chatgpt"
          : "deepseek",
      });
    }
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "aiPlatformDetected") {
    // We can use this to update the extension icon if needed
    chrome.action.setIcon({
      path: {
        16: "icon16.png",
        48: "icon48.png",
        128: "icon128.png",
      },
      tabId: sender.tab?.id,
    });
  }
  return true;
});
