import React from "react";
import { createRoot } from "react-dom/client";
import {
  PERPLEXITY_DOMAIN,
  CHATGPT_DOMAIN,
  DEEPSEEK_DOMAIN,
} from "../utils/constants";
import { Conversation } from "../types/sidePanel";
import { useSidePanelStore } from "../store/sidePanelStore";
import { useAuthStore } from "../store/authStore";
import { QuestionsCard } from "../components/QuestionsCard";
import { QuestionsToggleButton } from "../components/QuestionsToggleButton";
import {
  FolderListComponent,
  NewFolderButtonComponent,
} from "../components/sidePanel/FolderFeature";
import { NewFolderModal } from "../components/sidePanel/NewFolderModal";
import { FolderSelectionModal } from "../components/sidePanel/FolderSelectionModal";
import { SidePanel } from "../components/sidePanel/SidePanel";
import { AddChatsModal } from "../components/sidePanel/AddChatsModal";
import { CloudStorageStatus } from "../components/cloud/CloudStorageStatus";
import { AuthButton } from "../components/auth/AuthButton";
import { AuthModal } from "../components/auth/AuthModal";
import { SubscriptionModal } from "../components/subscription/SubscriptionModal";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { useSubscriptionStore } from "../store/subscriptionStore";
import { WebhookHandler } from "../components/subscription/WebhookHandler";

// Added NewFolderModal component from your interfac

// Function to add folder button to chats
// NOTE: This function is now MANUAL ONLY - it will not be called automatically
// To trigger it manually, use: triggerAddFolderButtons() in the browser console
const addFolderButtonToChats = (() => {
  let lastRunTime = 0;
  const DEBOUNCE_DELAY = 500; // 500ms debounce
  let lastChatCount = 0; // Track the last number of chats found
  const DEBUG_MODE = process.env.NODE_ENV === "development"; // Only log in development

  return () => {
    const now = Date.now();
    if (now - lastRunTime < DEBOUNCE_DELAY) {
      return; // Skip if called too recently
    }
    lastRunTime = now;

    // Use more comprehensive selectors to find chat links
    const chatSelectors = [
      'a[href^="/c/"]', // Standard chat links
      'a[href*="/c/"]', // Any link containing /c/
      "a[data-fill]", // Links with data-fill attribute
      'a[class*="__menu-item"]', // Menu item links
      'a[class*="hoverable"]', // Hoverable links
      'a[class*="group"]', // Links with group class
    ];

    let allChatItems: Element[] = [];

    // Collect all chat items from different selectors
    chatSelectors.forEach((selector) => {
      try {
        const items = Array.from(document.querySelectorAll(selector));
        allChatItems = [...allChatItems, ...items];
      } catch (error) {
        if (DEBUG_MODE) {
          console.warn(`Failed to query selector: ${selector}`, error);
        }
      }
    });

    // Remove duplicates based on href
    const uniqueChatItems = allChatItems.filter((item, index, self) => {
      const href = item.getAttribute("href");
      return (
        href && self.findIndex((i) => i.getAttribute("href") === href) === index
      );
    });

    console.log(
      `addFolderButtonToChats: Found ${uniqueChatItems.length} unique chat items (was ${lastChatCount})`
    );

    // Only log if the number of chats has changed or if it's the first run
    if (uniqueChatItems.length !== lastChatCount && DEBUG_MODE) {
      console.log(
        `addFolderButtonToChats: Found ${uniqueChatItems.length} unique chat items (was ${lastChatCount})`
      );
      lastChatCount = uniqueChatItems.length;
    }

    // Count how many buttons we actually add
    let buttonsAdded = 0;

    uniqueChatItems.forEach((chatItem) => {
      if (!chatItem.querySelector(".folder-add-button")) {
        // Find the trailing section where the options button is located
        const trailingSection = chatItem.querySelector(
          ".text-token-text-tertiary.flex.items-center.self-stretch"
        );

        if (trailingSection) {
          // Create a new trailing section for our add button
          const addButtonSection = document.createElement("div");
          addButtonSection.className =
            "text-token-text-tertiary flex items-center self-stretch";
          addButtonSection.style.marginRight = "4px"; // Add some spacing from the options button

          // Create the add button
          const folderButton = document.createElement("button");
          folderButton.className = "__menu-item-trailing-btn folder-add-button";
          folderButton.setAttribute("tabindex", "0");
          folderButton.setAttribute("aria-label", "Add to folder");
          folderButton.setAttribute("type", "button");
          folderButton.setAttribute("data-state", "closed");

          folderButton.innerHTML = `
            <div>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon" aria-hidden="true">
                <path d="M10 3V17M3 10H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          `;

          folderButton.style.cssText = `
            opacity: 0;
            transition: opacity 0.2s ease;
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--token-text-tertiary);
          `;

          addButtonSection.appendChild(folderButton);

          // Insert our button section before the existing trailing section
          trailingSection.parentNode?.insertBefore(
            addButtonSection,
            trailingSection
          );

          // Add hover effects
          chatItem.addEventListener("mouseenter", () => {
            folderButton.style.opacity = "1";
          });

          chatItem.addEventListener("mouseleave", () => {
            folderButton.style.opacity = "0";
          });

          folderButton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const chatId = chatItem.getAttribute("href")?.split("/c/")[1];
            if (chatId) {
              // Create a Conversation object for the selected chat
              const chatTitle =
                chatItem.textContent?.trim() || `Chat ${chatId}`;
              const chatUrl = `/c/${chatId}`;

              // Set the selected chat for folders with the chat information
              useSidePanelStore.getState().setSelectedChatForFolders({
                id: chatId,
                title: chatTitle,
                url: chatUrl,
                preview: "",
                platform: "chatgpt",
                timestamp: Date.now(),
                folderIds: [],
              });

              // Show the folder selection modal
              useSidePanelStore.getState().setShowFolderSelectionModal(true);
            }
          });

          buttonsAdded++;
        } else {
          // Fallback: if we can't find the trailing section, add the button directly to the chat item
          const folderButton = document.createElement("button");
          folderButton.className = "folder-add-button";
          folderButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`;
          folderButton.style.cssText = `
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(58, 132, 255, 0.1);
            border: 1px solid rgba(58, 132, 255, 0.3);
            border-radius: 4px;
            cursor: pointer;
            padding: 4px;
            opacity: 0;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            min-width: 24px;
            min-height: 24px;
          `;
          (chatItem as HTMLElement).style.position = "relative";
          chatItem.appendChild(folderButton);

          chatItem.addEventListener("mouseenter", () => {
            folderButton.style.opacity = "1";
            folderButton.style.background = "rgba(58, 132, 255, 0.2)";
            folderButton.style.borderColor = "rgba(58, 132, 255, 0.5)";
          });

          chatItem.addEventListener("mouseleave", () => {
            folderButton.style.opacity = "0";
            folderButton.style.background = "rgba(58, 132, 255, 0.1)";
            folderButton.style.borderColor = "rgba(58, 132, 255, 0.3)";
          });

          folderButton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const chatId = chatItem.getAttribute("href")?.split("/c/")[1];
            if (chatId) {
              // Create a Conversation object for the selected chat
              const chatTitle =
                chatItem.textContent?.trim() || `Chat ${chatId}`;
              const chatUrl = `/c/${chatId}`;

              // Set the selected chat for folders with the chat information
              useSidePanelStore.getState().setSelectedChatForFolders({
                id: chatId,
                title: chatTitle,
                url: chatUrl,
                preview: "",
                platform: "chatgpt",
                timestamp: Date.now(),
                folderIds: [],
              });

              // Show the folder selection modal
              useSidePanelStore.getState().setShowFolderSelectionModal(true);
            }
          });

          buttonsAdded++;
        }

        // Add click handler to the chat item itself to prevent default navigation
        chatItem.addEventListener("click", (e) => {
          // Only prevent default if it's a saved chat (has a folder button) and not a programmatic navigation
          if (
            chatItem.querySelector(".folder-add-button") &&
            !chatItem.hasAttribute("data-programmatic-navigation")
          ) {
            e.preventDefault();
            e.stopPropagation();

            const chatId = chatItem.getAttribute("href")?.split("/c/")[1];
            if (chatId) {
              // Find which folder contains this chat
              const folders = useSidePanelStore.getState().folders;
              let folderId = null;

              for (const folder of folders) {
                const chatExists = folder.conversations.some(
                  (conv) => conv.id === chatId
                );
                if (chatExists) {
                  folderId = folder.id;
                  break;
                }
              }

              // Use history API to navigate without page reload
              window.history.pushState({}, "", `/c/${chatId}`);

              // Dispatch a custom event to notify that navigation has occurred
              window.dispatchEvent(
                new CustomEvent("chatNavigation", {
                  detail: { chatId, folderId },
                })
              );
            }
          }
        });
      }
    });

    // Only log if we actually added buttons
    if (buttonsAdded > 0 && DEBUG_MODE) {
      console.log(
        `addFolderButtonToChats: Added ${buttonsAdded} folder buttons`
      );
    }
  };
})();

// Function to manually trigger adding folder buttons to chats
const triggerAddFolderButtons = () => {
  console.log("Manually triggering addFolderButtonToChats");
  addFolderButtonToChats();
};

// Make the function available globally for debugging/testing
// Usage: In browser console, type: triggerAddFolderButtons()
(window as any).triggerAddFolderButtons = triggerAddFolderButtons;

// Function to insert new folder button above target element

// Function to add download button to chat answers
const addDownloadButtonToAnswers = () => {
  const chatContainer = document.querySelector("main");
  if (!chatContainer) {
    console.log("addDownloadButtonToAnswers: No main container found");
    return;
  }

  // Find all edit buttons in the chat container
  const editButtons = chatContainer.querySelectorAll(
    'button[aria-label="Edit in canvas"]'
  );

  editButtons.forEach((editButton, index) => {
    // Check if download button already exists for this edit button
    const existingDownloadButton = editButton.parentElement?.querySelector(
      ".download-answer-button"
    );
    if (existingDownloadButton) {
      return;
    }

    // Create download button
    const downloadButton = document.createElement("button");
    downloadButton.className =
      "download-answer-button text-token-text-secondary hover:bg-token-bg-secondary rounded-lg";
    downloadButton.setAttribute("aria-label", "Download answer");
    downloadButton.setAttribute("data-state", "closed");

    downloadButton.innerHTML = `
      <span class="touch:w-10 flex h-8 w-8 items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
          <path d="M10.0003 2.5C10.3676 2.5 10.6653 2.79777 10.6653 3.16504V12.9883L13.4717 10.1819C13.7314 9.92226 14.1525 9.92226 14.4122 10.1819C14.6718 10.4416 14.6718 10.8627 14.4122 11.1223L10.4717 15.0628C10.212 15.3224 9.79097 15.3224 9.53131 15.0628L5.59082 11.1223C5.33118 10.8627 5.33118 10.4416 5.59082 10.1819C5.85046 9.92226 6.27153 9.92226 6.53117 10.1819L9.33521 12.9883V3.16504C9.33521 2.79777 9.63298 2.5 10.0003 2.5Z"></path>
          <path d="M17.5 16.6654C17.5 17.0326 17.2022 17.3304 16.835 17.3304H3.16504C2.79777 17.3304 2.5 17.0326 2.5 16.6654C2.5 16.2981 2.79777 16.0003 3.16504 16.0003H16.835C17.2022 16.0003 17.5 16.2981 17.5 16.6654Z"></path>
        </svg>
      </span>
    `;

    // Add click handler for download functionality
    downloadButton.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Debug: Log the edit button and its parent structure

      // Find the answer content using multiple approaches
      let assistantMessage = null;
      let answerContainer = null;

      // Approach 1: Look for assistant message using data attribute
      assistantMessage = editButton.closest(
        '[data-message-author-role="assistant"]'
      );

      // Approach 2: If not found, look for any parent with assistant role
      if (!assistantMessage) {
        assistantMessage = editButton.closest('[role="assistant"]');
      }

      // Approach 3: Look for parent with specific classes that indicate assistant message
      if (!assistantMessage) {
        assistantMessage =
          editButton.closest('.group[data-testid="conversation-turn-2"]') ||
          editButton.closest('.group[class*="group"]');
      }

      // Approach 4: Look for the closest div that contains markdown content
      if (!assistantMessage) {
        let currentElement = editButton.parentElement;
        while (currentElement && currentElement !== document.body) {
          if (currentElement.querySelector(".markdown")) {
            assistantMessage = currentElement;
            break;
          }
          currentElement = currentElement.parentElement;
        }
      }

      // Now try to find the answer container
      if (assistantMessage) {
        // Try multiple selectors for the answer container
        answerContainer =
          assistantMessage.querySelector(
            ".markdown.prose.dark\\:prose-invert.w-full.break-words.light"
          ) ||
          assistantMessage.querySelector(".markdown") ||
          assistantMessage.querySelector('[class*="markdown"]') ||
          assistantMessage.querySelector('[class*="prose"]');
      }

      // If still not found, try searching from the edit button's context
      if (!answerContainer) {
        // Search in parent elements
        let currentElement = editButton.parentElement;
        while (currentElement && currentElement !== document.body) {
          const markdownElement =
            currentElement.querySelector(".markdown") ||
            currentElement.querySelector('[class*="markdown"]') ||
            currentElement.querySelector('[class*="prose"]');
          if (markdownElement) {
            answerContainer = markdownElement;

            break;
          }
          currentElement = currentElement.parentElement;
        }
      }

      // Debug: Log all markdown elements in the document to see what's available
      if (!answerContainer) {
        const allMarkdownElements = document.querySelectorAll(
          '.markdown, [class*="markdown"], [class*="prose"]'
        );

        // Try to find the closest one to our edit button
        let closestElement = null;
        let closestDistance = Infinity;

        allMarkdownElements.forEach((element) => {
          const rect1 = editButton.getBoundingClientRect();
          const rect2 = element.getBoundingClientRect();
          const distance = Math.sqrt(
            Math.pow(rect1.left - rect2.left, 2) +
              Math.pow(rect1.top - rect2.top, 2)
          );
          if (distance < closestDistance) {
            closestDistance = distance;
            closestElement = element;
          }
        });

        if (closestElement) {
          answerContainer = closestElement;
        }
      }

      if (answerContainer) {
        try {
          // Get the HTML content
          // Get the HTML content
          const htmlContent = answerContainer.innerHTML || "";
          const textContent = answerContainer.textContent || "";

          if (!htmlContent.trim() && !textContent.trim()) {
            throw new Error("No content found in answer container");
          }

          // Create a temporary print container
          const printContainer = document.createElement("div");
          printContainer.id = "chatgpt-print-container";
          printContainer.innerHTML = htmlContent;

          // Add print-specific styles
          const printStyles = document.createElement("style");
          printStyles.id = "chatgpt-print-styles";
          printStyles.textContent = `
            @media print {
              /* Hide everything except our print container */
              body > *:not(#chatgpt-print-container) {
                display: none !important;
              }
              
              /* Style the print container */
              #chatgpt-print-container {
                display: block !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                line-height: 1.6 !important;
                color: #333 !important;
                max-width: 800px !important;
                margin: 0 auto !important;
                padding: 20px !important;
                background: white !important;
              }
              
              #chatgpt-print-container h1, 
              #chatgpt-print-container h2, 
              #chatgpt-print-container h3, 
              #chatgpt-print-container h4, 
              #chatgpt-print-container h5, 
              #chatgpt-print-container h6 {
                margin-top: 1.5em !important;
                margin-bottom: 0.5em !important;
                font-weight: 600 !important;
              }
              
              #chatgpt-print-container h1 { font-size: 1.8em !important; }
              #chatgpt-print-container h2 { font-size: 1.5em !important; }
              #chatgpt-print-container h3 { font-size: 1.3em !important; }
              
              #chatgpt-print-container p {
                margin-bottom: 1em !important;
              }
              
              #chatgpt-print-container ul, 
              #chatgpt-print-container ol {
                margin-bottom: 1em !important;
                padding-left: 2em !important;
              }
              
              #chatgpt-print-container li {
                margin-bottom: 0.5em !important;
              }
              
              #chatgpt-print-container code {
                background-color: #f6f8fa !important;
                padding: 2px 4px !important;
                border-radius: 3px !important;
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace !important;
                font-size: 0.9em !important;
              }
              
              #chatgpt-print-container pre {
                background-color: #f6f8fa !important;
                padding: 16px !important;
                border-radius: 6px !important;
                overflow-x: auto !important;
                margin: 1em 0 !important;
              }
              
              #chatgpt-print-container pre code {
                background: none !important;
                padding: 0 !important;
              }
              
              #chatgpt-print-container blockquote {
                border-left: 4px solid #ddd !important;
                margin: 1em 0 !important;
                padding-left: 1em !important;
                color: #666 !important;
              }
              
              #chatgpt-print-container strong {
                font-weight: 600 !important;
              }
              
              #chatgpt-print-container em {
                font-style: italic !important;
              }
            }
            
            /* Hide print container in normal view */
            #chatgpt-print-container {
              display: none;
            }
          `;

          // Add elements to the page
          document.head.appendChild(printStyles);
          document.body.appendChild(printContainer);

          // Function to clean up after printing
          const cleanup = () => {
            const existingContainer = document.getElementById(
              "chatgpt-print-container"
            );
            const existingStyles = document.getElementById(
              "chatgpt-print-styles"
            );
            if (existingContainer) {
              existingContainer.remove();
            }
            if (existingStyles) {
              existingStyles.remove();
            }
          };

          // Listen for print events to clean up
          const handleAfterPrint = () => {
            cleanup();
            window.removeEventListener("afterprint", handleAfterPrint);
          };
          window.addEventListener("afterprint", handleAfterPrint);

          // Trigger print
          window.print();
        } catch (error) {
          console.error(
            "addDownloadButtonToAnswers: Error setting up print:",
            error
          );

          // Clean up on error
          const existingContainer = document.getElementById(
            "chatgpt-print-container"
          );
          const existingStyles = document.getElementById(
            "chatgpt-print-styles"
          );
          if (existingContainer) {
            existingContainer.remove();
          }
          if (existingStyles) {
            existingStyles.remove();
          }
        }
      } else {
        console.error(
          "addDownloadButtonToAnswers: No answer container found after all attempts"
        );
      }
    });

    // Insert the download button after the edit button
    const buttonContainer = editButton.parentElement;
    if (buttonContainer) {
      buttonContainer.insertBefore(downloadButton, editButton.nextSibling);
    } else {
      console.error(
        `addDownloadButtonToAnswers: No button container found for edit button ${
          index + 1
        }`
      );
    }
  });
};

// App component
const App: React.FC = () => {
  const [platform, setPlatform] = React.useState<
    "perplexity" | "chatgpt" | "deepseek" | null
  >(null);
  const [showQuestions, setShowQuestions] = React.useState(false);
  const [questions, setQuestions] = React.useState<string[]>([]);
  const [currentChatId, setCurrentChatId] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const questionsCardRef = React.useRef<HTMLDivElement>(null);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] =
    React.useState(false);
  const [subscriptionTrigger, setSubscriptionTrigger] = React.useState<
    "upgrade" | "limit-reached" | "feature-gated"
  >("upgrade");

  // Auth and cloud storage state
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    initializeAuth,
  } = useAuthStore();

  const {
    setIsOnline,
    isCloudEnabled,
    setupCloudListeners,
    cleanupCloudListeners,
  } = useSidePanelStore();

  const { initializeSubscription, updateUsageMetrics } = useSubscriptionStore();

  // Initialize authentication
  React.useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [initializeAuth]);

  // Set up online/offline detection
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set initial online status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline]);

  // Set up cloud listeners when authenticated and cloud is enabled
  React.useEffect(() => {
    if (isAuthenticated && isCloudEnabled && user) {
      setupCloudListeners();
      return () => {
        cleanupCloudListeners();
      };
    }
  }, [
    isAuthenticated,
    isCloudEnabled,
    user,
    setupCloudListeners,
    cleanupCloudListeners,
  ]);

  // Initialize subscription when authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      initializeSubscription();
    }
  }, [isAuthenticated, user, initializeSubscription]);

  // Handle subscription modal events
  React.useEffect(() => {
    const handleShowSubscriptionModal = (event: CustomEvent) => {
      setSubscriptionTrigger(event.detail.trigger || "upgrade");
      setShowSubscriptionModal(true);
    };

    window.addEventListener(
      "showSubscriptionModal",
      handleShowSubscriptionModal as EventListener
    );

    return () => {
      window.removeEventListener(
        "showSubscriptionModal",
        handleShowSubscriptionModal as EventListener
      );
    };
  }, []);

  // Add event listener for chat navigation
  React.useEffect(() => {
    const handleChatNavigation = (event: CustomEvent) => {
      const { chatId } = event.detail;

      setCurrentChatId(chatId);

      // Find the chat element
      const chatElement = document.querySelector(
        `a[href="/c/${chatId}"]`
      ) as HTMLElement;
      if (chatElement) {
        // Create a data attribute to mark this as a programmatic navigation
        chatElement.setAttribute("data-programmatic-navigation", "true");

        // Create and dispatch a synthetic click event
        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        chatElement.dispatchEvent(clickEvent);
      }
    };

    window.addEventListener(
      "chatNavigation",
      handleChatNavigation as EventListener
    );

    // Also check the current URL to set the initial chat ID
    const extractChatIdFromUrl = () => {
      const path = window.location.pathname;

      // Try different URL patterns
      const patterns = [
        /\/c\/([^\/]+)/, // Standard format: /c/chatId
        /\/chat\/([^\/]+)/, // Alternative format: /chat/chatId
        /\/([a-f0-9-]{36})/, // UUID format
      ];

      for (const pattern of patterns) {
        const match = path.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }

      return null;
    };

    const initialChatId = extractChatIdFromUrl();
    if (initialChatId) {
      setCurrentChatId(initialChatId);
    }

    return () => {
      window.removeEventListener(
        "chatNavigation",
        handleChatNavigation as EventListener
      );
    };
  }, []);

  // Update folder management when currentChatId changes
  React.useEffect(() => {
    if (platform === "chatgpt") {
      updateFolderManagement();
    }
  }, [currentChatId, platform]);

  // Add click outside listener for QuestionsCard
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showQuestions &&
        questionsCardRef.current &&
        !questionsCardRef.current.contains(event.target as Node)
      ) {
        setShowQuestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showQuestions]);

  React.useEffect(() => {
    // Detect which platform we're on
    const hostname = window.location.hostname;

    let platform: "perplexity" | "chatgpt" | "deepseek" | null = null;

    if (hostname.includes(PERPLEXITY_DOMAIN)) {
      platform = "perplexity";
    } else if (hostname.includes(CHATGPT_DOMAIN)) {
      platform = "chatgpt";
    } else if (hostname.includes(DEEPSEEK_DOMAIN)) {
      platform = "deepseek";
    }

    setPlatform(platform);

    if (platform) {
      chrome.runtime.sendMessage({
        action: "aiPlatformDetected",
        platform,
      });
    }
  }, []);

  const {
    setShowNewFolderModal,
    showNewFolderModal,
    showFolderSelectionModal,
    selectedChats,
    showAddChatsModal,
    selectedFolder,
  } = useSidePanelStore();

  // Debug logging for modal state
  React.useEffect(() => {
    console.log(
      `App Debug: showAddChatsModal = ${showAddChatsModal}, selectedFolder =`,
      selectedFolder
    );
  }, [showAddChatsModal, selectedFolder]);

  const handleOnQuestionClick = (question: string) => {
    const chatContainer = document.querySelector("main");
    if (!chatContainer) return;

    // Find all elements with the whitespace-pre-wrap class
    const questionElements = chatContainer.querySelectorAll(
      'div[class*="whitespace-pre-wrap"]'
    );

    // Look for the element that contains the clicked question
    for (const element of questionElements) {
      const elementText = element.textContent?.trim();
      if (elementText === question.trim()) {
        // Scroll to the element with smooth behavior
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Add a temporary highlight effect
        const htmlElement = element as HTMLElement;
        const originalBackground = htmlElement.style.backgroundColor;
        htmlElement.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
        htmlElement.style.transition = "background-color 0.3s ease";

        // Remove the highlight after 2 seconds
        setTimeout(() => {
          htmlElement.style.backgroundColor = originalBackground;
        }, 2000);

        break;
      }
    }
  };

  const insertNewFolderButtonAboveTarget = () => {
    const targetElement = document.querySelector(
      ".pt-\\(--sidebar-section-margin-top\\).last\\:mb-5"
    );

    if (
      targetElement &&
      !document.getElementById("folder-management-container")
    ) {
      // Create container for our folder management components
      const folderContainer = document.createElement("div");
      folderContainer.id = "folder-management-container";
      folderContainer.style.marginBottom = "10px";

      // Insert before target element
      targetElement.parentNode?.insertBefore(folderContainer, targetElement);

      // Render React component into container
      const root = createRoot(folderContainer);

      // Create a wrapper component to use the store hooks
      const FolderManagement = () => {
        const {
          folders,
          setShowNewFolderModal,
          setEditingFolderId,
          handleDeleteFolder,
          openAddChatsModal,
          getFolderConversations,
          removeChatFromFolder,
        } = useSidePanelStore();

        const handleNewFolderClick = () => {
          // This is just a placeholder since NewFolderButtonComponent already calls setShowNewFolderModal
        };

        const handleEditFolder = (folderId: string) => {
          setEditingFolderId(folderId);
          const folder = folders.find((f) => f.id === folderId);
          if (folder) {
            // You might want to set other states as needed from your store
            setShowNewFolderModal(true);
          }
        };

        const handleSelectChat = (chatId: string, folderId: string) => {
          // Prevent default navigation and handle it programmatically
          const chatUrl = `/c/${chatId}`;

          // Use history API to navigate without page reload
          window.history.pushState({}, "", chatUrl);

          // Dispatch a custom event to notify that navigation has occurred
          window.dispatchEvent(
            new CustomEvent("chatNavigation", {
              detail: { chatId, folderId },
            })
          );

          // Optionally, you can also update the UI to reflect the selected chat
          // This depends on how ChatGPT's UI is structured
        };

        const handleRemoveChat = (folderId: string, chatId: string) => {
          removeChatFromFolder(folderId, chatId);
        };

        return (
          <div className="folder-management">
            <NewFolderButtonComponent
              onClick={handleNewFolderClick}
              label="New Folder"
            />

            {folders.length > 0 && (
              <FolderListComponent
                folders={folders}
                onEditFolder={handleEditFolder}
                onDeleteFolder={handleDeleteFolder}
                onAddChats={(folderId) =>
                  openAddChatsModal(folderId, {} as any)
                }
                onSelectChat={handleSelectChat}
                onRemoveChat={handleRemoveChat}
                currentChatId={currentChatId || undefined}
              />
            )}
          </div>
        );
      };

      root.render(<FolderManagement key={currentChatId || "no-chat"} />);

      // Store the root reference for later updates
      (folderContainer as any)._root = root;
    }
  };

  // Function to update the folder management component when currentChatId changes
  const updateFolderManagement = () => {
    const existingContainer = document.getElementById(
      "folder-management-container"
    );
    if (existingContainer) {
      const existingRoot = (existingContainer as any)._root;
      if (existingRoot) {
        // Create the FolderManagement component again with current currentChatId
        const FolderManagement = () => {
          const {
            folders,
            setShowNewFolderModal,
            setEditingFolderId,
            handleDeleteFolder,
            openAddChatsModal,
            getFolderConversations,
            removeChatFromFolder,
          } = useSidePanelStore();

          const handleNewFolderClick = () => {
            // This is just a placeholder since NewFolderButtonComponent already calls setShowNewFolderModal
          };

          const handleEditFolder = (folderId: string) => {
            setEditingFolderId(folderId);
            const folder = folders.find((f) => f.id === folderId);
            if (folder) {
              // You might want to set other states as needed from your store
              setShowNewFolderModal(true);
            }
          };

          const handleSelectChat = (chatId: string, folderId: string) => {
            // Prevent default navigation and handle it programmatically
            const chatUrl = `/c/${chatId}`;

            // Use history API to navigate without page reload
            window.history.pushState({}, "", chatUrl);

            // Dispatch a custom event to notify that navigation has occurred
            window.dispatchEvent(
              new CustomEvent("chatNavigation", {
                detail: { chatId, folderId },
              })
            );

            // Optionally, you can also update the UI to reflect the selected chat
            // This depends on how ChatGPT's UI is structured
          };

          const handleRemoveChat = (folderId: string, chatId: string) => {
            removeChatFromFolder(folderId, chatId);
          };

          return (
            <div className="folder-management">
              <NewFolderButtonComponent
                onClick={handleNewFolderClick}
                label="New Folder"
              />

              {folders.length > 0 && (
                <FolderListComponent
                  folders={folders}
                  onEditFolder={handleEditFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onAddChats={(folderId) =>
                    openAddChatsModal(folderId, {} as any)
                  }
                  onSelectChat={handleSelectChat}
                  onRemoveChat={handleRemoveChat}
                  currentChatId={currentChatId || undefined}
                />
              )}
            </div>
          );
        };

        existingRoot.render(
          <FolderManagement key={currentChatId || "no-chat"} />
        );
      }
    }
  };
  // Add folder button observer effect
  React.useEffect(() => {
    if (platform === "chatgpt") {
      // Function to add folder buttons to the sidenav
      const addFolderButtonsToSidenav = () => {
        const sidebar = document.querySelector('nav[class*="flex-col"]');
        if (!sidebar) {
          return;
        }

        insertNewFolderButtonAboveTarget();
        addDownloadButtonToAnswers(); // Add download buttons
        // Removed automatic call to addFolderButtonToChats - now manual only

        // Render NewFolderButtonComponent in the specified class
        const targetElement = document.querySelector(
          ".group > div > div:nth-child(2)"
        );
        if (
          targetElement &&
          !targetElement.querySelector(".new-folder-button-container")
        ) {
          const newFolderButtonContainer = document.createElement("div");
          newFolderButtonContainer.className = "new-folder-button-container";
          targetElement.appendChild(newFolderButtonContainer);
          const root = createRoot(newFolderButtonContainer);
          // root.render(<NewFolderButtonComponent onClick={() => {}} />);
        }
      };

      // Initial setup
      addFolderButtonsToSidenav();

      // Removed automatic interval - no more periodic calls

      // Set up observer for the entire document to detect when sidenav is reopened
      const documentObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            // Check if the sidenav was added back to the DOM
            const sidebar = document.querySelector('nav[class*="flex-col"]');
            if (sidebar) {
              addFolderButtonsToSidenav();
            }
            // Removed automatic call to addFolderButtonToChats - now manual only
          }
        }
      });

      // Observe the entire document for changes
      documentObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return () => {
        documentObserver.disconnect();
      };
    }
  }, [platform]);

  // Questions tracking effect
  React.useEffect(() => {
    if (platform === "chatgpt") {
      const chatContainer = document.querySelector("main");
      if (!chatContainer) return;

      const observer = new MutationObserver(() => {
        const questionElements = chatContainer.querySelectorAll(
          'div[class*="whitespace-pre-wrap"]'
        );
        const newQuestions = Array.from(questionElements).map(
          (el) => el.textContent || ""
        );
        setQuestions(newQuestions);
      });

      observer.observe(chatContainer, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
  }, [platform]);

  // Don't render if we're not on a supported platform
  if (!platform) {
    return null;
  }

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <svg
              className="animate-spin h-6 w-6 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-gray-700">Initializing...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WebhookHandler>
      <QuestionsToggleButton
        showQuestions={showQuestions}
        onToggle={() => setShowQuestions(!showQuestions)}
      />
      {showQuestions && (
        <div ref={questionsCardRef}>
          <QuestionsCard
            questions={questions}
            onQuestionClick={handleOnQuestionClick}
          />
        </div>
      )}
      <SidePanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        platform={platform}
        currentChatId={currentChatId || undefined}
      />
      {showNewFolderModal && <NewFolderModal />}
      {showFolderSelectionModal && <FolderSelectionModal />}
      {showAddChatsModal && selectedFolder && (
        <AddChatsModal folder={selectedFolder} />
      )}
      <AuthButton onShowAuthModal={() => setShowAuthModal(true)} />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        trigger={subscriptionTrigger}
      />
    </WebhookHandler>
  );
};

// Create a container for our React app
const createAppContainer = () => {
  const existingContainer = document.getElementById(
    "ai-assistant-extension-root"
  );
  if (existingContainer) {
    return existingContainer;
  }

  const appContainer = document.createElement("div");
  appContainer.id = "ai-assistant-extension-root";
  appContainer.style.position = "fixed";
  appContainer.style.top = "0";
  appContainer.style.left = "0";
  appContainer.style.width = "100%";
  appContainer.style.height = "100%";
  appContainer.style.zIndex = "9999";
  appContainer.style.pointerEvents = "none";
  document.body.appendChild(appContainer);
  return appContainer;
};

// Initialize the UI
const init = () => {
  try {
    const container = createAppContainer();
    const root = createRoot(container);
    root.render(<App />);
  } catch (error) {
    console.error("Error initializing extension:", error);
  }
};

// Ensure the DOM is loaded before initializing
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  setTimeout(init, 500);
}

export default App;
