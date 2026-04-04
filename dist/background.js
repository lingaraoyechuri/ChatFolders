/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/utils/browser.ts":
/*!******************************!*\
  !*** ./src/utils/browser.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   downloadsDownload: () => (/* binding */ downloadsDownload),
/* harmony export */   tabsQuery: () => (/* binding */ tabsQuery),
/* harmony export */   tabsSendMessage: () => (/* binding */ tabsSendMessage)
/* harmony export */ });
// Chrome extension APIs. Lazy init avoids touching `chrome` before the runtime is ready in edge cases.
let extensionApi = null;
function ensureChrome() {
    if (extensionApi !== null) {
        return extensionApi;
    }
    try {
        if (typeof chrome !== "undefined" && chrome.runtime) {
            extensionApi = chrome;
            return extensionApi;
        }
    }
    catch (_a) {
        /* ignore */
    }
    console.error("[Browser API] chrome extension API not found");
    extensionApi = {};
    return extensionApi;
}
function checkLastErrorInline(api) {
    try {
        const lastError = api.runtime.lastError;
        if (lastError) {
            return lastError.message || "Unknown error";
        }
        return null;
    }
    catch (_a) {
        return null;
    }
}
const tabsQuery = (queryInfo) => {
    const api = ensureChrome();
    if (!api.tabs) {
        return Promise.reject(new Error("Tabs API not available"));
    }
    return new Promise((resolve, reject) => {
        api.tabs.query(queryInfo, (tabs) => {
            const errorMsg = checkLastErrorInline(api);
            if (errorMsg) {
                reject(new Error(errorMsg));
            }
            else {
                resolve(tabs);
            }
        });
    });
};
const tabsSendMessage = (tabId, message) => {
    const api = ensureChrome();
    if (!api.tabs) {
        return Promise.reject(new Error("Tabs API not available"));
    }
    return new Promise((resolve, reject) => {
        api.tabs.sendMessage(tabId, message, (response) => {
            const errorMsg = checkLastErrorInline(api);
            if (errorMsg) {
                reject(new Error(errorMsg));
            }
            else {
                resolve(response);
            }
        });
    });
};
const downloadsDownload = (options) => {
    const api = ensureChrome();
    if (!api.downloads) {
        return Promise.reject(new Error("Downloads API not available"));
    }
    return new Promise((resolve, reject) => {
        api.downloads.download(options, (downloadId) => {
            const errorMsg = checkLastErrorInline(api);
            if (errorMsg) {
                reject(new Error(errorMsg));
            }
            else {
                resolve(downloadId);
            }
        });
    });
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ensureChrome());


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**************************************!*\
  !*** ./src/background/background.ts ***!
  \**************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _utils_browser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/browser */ "./src/utils/browser.ts");
// src/background/background.ts

_utils_browser__WEBPACK_IMPORTED_MODULE_0__["default"].runtime.onInstalled.addListener(() => {
    // Extension installed
});
// Listen for tab updates to detect AI platforms
_utils_browser__WEBPACK_IMPORTED_MODULE_0__["default"].tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        const url = tab.url.toLowerCase();
        // URL changed
        // Check if the page is one of our supported AI platforms
        if (url.includes("perplexity.ai") ||
            url.includes("chatgpt.com") ||
            url.includes("chat.deepseek.com") ||
            url.includes("gemini.google.com")) {
            // The page is a supported AI platform and has finished loading
            _utils_browser__WEBPACK_IMPORTED_MODULE_0__["default"].tabs.sendMessage(tabId, {
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
_utils_browser__WEBPACK_IMPORTED_MODULE_0__["default"].runtime.onMessage.addListener((request, sender, sendResponse) => {
    var _a;
    if (request.action === "aiPlatformDetected") {
        // We can use this to update the extension icon if needed
        _utils_browser__WEBPACK_IMPORTED_MODULE_0__["default"].action.setIcon({
            path: {
                16: "icon16.png",
                48: "icon48.png",
                128: "icon128.png",
            },
            tabId: (_a = sender.tab) === null || _a === void 0 ? void 0 : _a.id,
        });
    }
    return true;
});

})();

/******/ })()
;