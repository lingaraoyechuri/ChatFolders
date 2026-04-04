// Chrome extension APIs. Lazy init avoids touching `chrome` before the runtime is ready in edge cases.

let extensionApi: typeof chrome | null = null;

function ensureChrome(): typeof chrome {
  if (extensionApi !== null) {
    return extensionApi;
  }

  try {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      extensionApi = chrome;
      return extensionApi;
    }
  } catch {
    /* ignore */
  }

  console.error("[Browser API] chrome extension API not found");
  extensionApi = {} as typeof chrome;
  return extensionApi;
}

function checkLastErrorInline(api: typeof chrome): string | null {
  try {
    const lastError = api.runtime.lastError;
    if (lastError) {
      return lastError.message || "Unknown error";
    }
    return null;
  } catch {
    return null;
  }
}

export const tabsQuery = (
  queryInfo: chrome.tabs.QueryInfo
): Promise<chrome.tabs.Tab[]> => {
  const api = ensureChrome();
  if (!api.tabs) {
    return Promise.reject(new Error("Tabs API not available"));
  }

  return new Promise((resolve, reject) => {
    api.tabs.query(queryInfo, (tabs) => {
      const errorMsg = checkLastErrorInline(api);
      if (errorMsg) {
        reject(new Error(errorMsg));
      } else {
        resolve(tabs);
      }
    });
  });
};

export const tabsSendMessage = (
  tabId: number,
  message: unknown
): Promise<any> => {
  const api = ensureChrome();
  if (!api.tabs) {
    return Promise.reject(new Error("Tabs API not available"));
  }

  return new Promise((resolve, reject) => {
    api.tabs.sendMessage(tabId, message, (response) => {
      const errorMsg = checkLastErrorInline(api);
      if (errorMsg) {
        reject(new Error(errorMsg));
      } else {
        resolve(response);
      }
    });
  });
};

export const downloadsDownload = (
  options: chrome.downloads.DownloadOptions
): Promise<number> => {
  const api = ensureChrome();
  if (!api.downloads) {
    return Promise.reject(new Error("Downloads API not available"));
  }

  return new Promise((resolve, reject) => {
    api.downloads.download(options, (downloadId) => {
      const errorMsg = checkLastErrorInline(api);
      if (errorMsg) {
        reject(new Error(errorMsg));
      } else {
        resolve(downloadId);
      }
    });
  });
};

export default ensureChrome();
