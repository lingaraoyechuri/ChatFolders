import React from "react";
import { createRoot } from "react-dom/client";
import {
  PERPLEXITY_DOMAIN,
  CHATGPT_DOMAIN,
  DEEPSEEK_DOMAIN,
} from "../utils/constants";
import { Conversation } from "../types/sidePanel";
import { useSidePanelStore } from "../store/sidePanelStore";
import { QuestionsCard } from "../components/QuestionsCard";
import { QuestionsToggleButton } from "../components/QuestionsToggleButton";
import {
  FolderListComponent,
  NewFolderButtonComponent,
} from "../components/sidePanel/FolderFeature";
import { NewFolderModal } from "../components/sidePanel/NewFolderModal";
import { FolderSelectionModal } from "../components/sidePanel/FolderSelectionModal";
import { SidePanel } from "../components/sidePanel/SidePanel";

// Added NewFolderModal component from your interfac

// Function to add folder button to chats
const addFolderButtonToChats = () => {
  const chatItems = document.querySelectorAll('a[href^="/c/"]');
  chatItems.forEach((chatItem) => {
    if (!chatItem.querySelector(".folder-button")) {
      const folderButton = document.createElement("button");
      folderButton.className = "folder-button";
      folderButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
      folderButton.style.cssText = `
        position: absolute;
        right: 28px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        opacity: 0;
        transition: opacity 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      (chatItem as HTMLElement).style.position = "relative";
      chatItem.appendChild(folderButton);

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
          const chatTitle = chatItem.textContent?.trim() || `Chat ${chatId}`;
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

      // Add click handler to the chat item itself to prevent default navigation
      chatItem.addEventListener("click", (e) => {
        // Only prevent default if it's a saved chat (has a folder button) and not a programmatic navigation
        if (
          chatItem.querySelector(".folder-button") &&
          !chatItem.hasAttribute("data-programmatic-navigation")
        ) {
          e.preventDefault();
          e.stopPropagation();

          const chatId = chatItem.getAttribute("href")?.split("/c/")[1];
          if (chatId) {
            // Use history API to navigate without page reload
            window.history.pushState({}, "", `/c/${chatId}`);

            // Dispatch a custom event to notify that navigation has occurred
            window.dispatchEvent(
              new CustomEvent("chatNavigation", {
                detail: { chatId },
              })
            );
          }
        }
      });
    }
  });
};

// Function to insert new folder button above target element

// App component
const App: React.FC = () => {
  const [platform, setPlatform] = React.useState<
    "perplexity" | "chatgpt" | "deepseek" | null
  >(null);
  const [showQuestions, setShowQuestions] = React.useState(false);
  const [questions, setQuestions] = React.useState<string[]>([]);
  const [currentChatId, setCurrentChatId] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  // Add event listener for chat navigation
  React.useEffect(() => {
    const handleChatNavigation = (event: CustomEvent) => {
      const { chatId } = event.detail;
      console.log(`App: Received chatNavigation event with chatId = ${chatId}`);
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
      console.log(`App: Current path = ${path}`);

      // Try different URL patterns
      const patterns = [
        /\/c\/([^\/]+)/, // Standard format: /c/chatId
        /\/chat\/([^\/]+)/, // Alternative format: /chat/chatId
        /\/([a-f0-9-]{36})/, // UUID format
      ];

      for (const pattern of patterns) {
        const match = path.match(pattern);
        if (match && match[1]) {
          console.log(
            `App: Found chatId from URL pattern ${pattern}: ${match[1]}`
          );
          return match[1];
        }
      }

      return null;
    };

    const initialChatId = extractChatIdFromUrl();
    if (initialChatId) {
      console.log(`App: Setting initial chatId from URL = ${initialChatId}`);
      setCurrentChatId(initialChatId);
    }

    return () => {
      window.removeEventListener(
        "chatNavigation",
        handleChatNavigation as EventListener
      );
    };
  }, []);

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
  } = useSidePanelStore();

  const insertNewFolderButtonAboveTarget = () => {
    const targetElement = document.querySelector(
      ".flex.flex-col.gap-2.text-token-text-primary.text-sm.mt-5.first\\:mt-0.false"
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
          console.log(
            `FolderManagement: Removing chat ${chatId} from folder ${folderId}`
          );
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
              />
            )}
          </div>
        );
      };

      root.render(<FolderManagement />);
    }
  };
  // Add folder button observer effect
  React.useEffect(() => {
    if (platform === "chatgpt") {
      // Function to add folder buttons to the sidenav
      const addFolderButtonsToSidenav = () => {
        const sidebar = document.querySelector('nav[class*="flex-col"]');
        if (!sidebar) return;

        addFolderButtonToChats();
        insertNewFolderButtonAboveTarget();

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
          root.render(<NewFolderButtonComponent onClick={() => {}} />);
        }
      };

      // Initial setup
      addFolderButtonsToSidenav();

      // Set up observer for the entire document to detect when sidenav is reopened
      const documentObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            // Check if the sidenav was added back to the DOM
            const sidebar = document.querySelector('nav[class*="flex-col"]');
            if (sidebar) {
              addFolderButtonsToSidenav();
            }
          }
        }
      });

      // Observe the entire document for changes
      documentObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Set up observer for dynamic chat elements within the sidebar
      const sidebar = document.querySelector('nav[class*="flex-col"]');
      if (sidebar) {
        const folderButtonObserver = new MutationObserver(() => {
          addFolderButtonToChats();
          insertNewFolderButtonAboveTarget();
        });

        folderButtonObserver.observe(sidebar, {
          childList: true,
          subtree: true,
        });

        return () => {
          folderButtonObserver.disconnect();
          documentObserver.disconnect();
        };
      }

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
          'div[class*="markdown"]'
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

  return (
    <>
      <QuestionsToggleButton
        showQuestions={showQuestions}
        onToggle={() => setShowQuestions(!showQuestions)}
      />
      {showQuestions && <QuestionsCard questions={questions} />}
      <SidePanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        platform={platform}
        currentChatId={currentChatId || undefined}
      />
      {showNewFolderModal && <NewFolderModal />}
      {showFolderSelectionModal && <FolderSelectionModal />}
    </>
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
