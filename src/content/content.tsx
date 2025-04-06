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
  FolderList,
  NewFolderButtonComponent,
} from "../components/sidePanel/FolderFeature";
import { NewFolderModal } from "../components/sidePanel/NewFolderModal";
import { FolderSelectionModal } from "../components/sidePanel/FolderSelectionModal";

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
    }
  });
};

// Function to insert new folder button above target element

// App component
const App: React.FC = () => {
  const [currentPlatform, setCurrentPlatform] = React.useState<
    "perplexity" | "chatgpt" | "deepseek" | null
  >(null);
  const [showQuestions, setShowQuestions] = React.useState(false);
  const [questions, setQuestions] = React.useState<string[]>([]);

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

    setCurrentPlatform(platform);

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
          // Implement chat selection logic here
          // This could navigate to the chat or perform other actions
          window.location.href = `/c/${chatId}`;
        };

        return (
          <div className="folder-management">
            <NewFolderButtonComponent
              onClick={handleNewFolderClick}
              label="New Folder"
            />

            {folders.length > 0 && (
              <FolderList
                folders={folders}
                onEditFolder={handleEditFolder}
                onDeleteFolder={handleDeleteFolder}
                onAddChats={(folderId) =>
                  openAddChatsModal(folderId, {} as any)
                }
                onSelectChat={handleSelectChat}
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
    if (currentPlatform === "chatgpt") {
      const sidebar = document.querySelector('nav[class*="flex-col"]');
      if (!sidebar) return;

      const folderButtonObserver = new MutationObserver(() => {
        addFolderButtonToChats();
        insertNewFolderButtonAboveTarget();
      });

      folderButtonObserver.observe(sidebar, {
        childList: true,
        subtree: true,
      });

      // Initial update
      addFolderButtonToChats();
      insertNewFolderButtonAboveTarget();

      // Render NewFolderButtonComponent in the specified class
      const targetElement = document.querySelector(
        ".group > div > div:nth-child(2)"
      );
      if (targetElement) {
        const newFolderButtonContainer = document.createElement("div");
        targetElement.appendChild(newFolderButtonContainer);
        const root = createRoot(newFolderButtonContainer);
        root.render(<NewFolderButtonComponent onClick={() => {}} />);
      }

      return () => {
        folderButtonObserver.disconnect();
      };
    }
  }, [currentPlatform]);

  // Questions tracking effect
  React.useEffect(() => {
    if (currentPlatform === "chatgpt") {
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
  }, [currentPlatform]);

  // Don't render if we're not on a supported platform
  if (!currentPlatform) {
    return null;
  }

  return (
    <>
      {currentPlatform === "chatgpt" && (
        <>
          <QuestionsToggleButton
            showQuestions={showQuestions}
            onToggle={() => setShowQuestions(!showQuestions)}
          />
          {showQuestions && <QuestionsCard questions={questions} />}
          {showNewFolderModal && <NewFolderModal />}
          {showFolderSelectionModal && <FolderSelectionModal />}
        </>
      )}
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
