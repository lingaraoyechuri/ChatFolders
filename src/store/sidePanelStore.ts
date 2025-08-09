import { create } from "zustand";
import { Folder, Conversation, Platform } from "../types/sidePanel";
import { useAuthStore } from "./authStore";
import { useSubscriptionStore } from "./subscriptionStore";
import { cloudStorage } from "../services/cloudStorage";

// Load initial state from localStorage
const loadInitialState = () => {
  try {
    const savedFolders = localStorage.getItem("folders");
    return {
      folders: savedFolders ? JSON.parse(savedFolders) : [],
    };
  } catch (error) {
    console.error("Error loading state from localStorage:", error);
    return { folders: [] };
  }
};

// Save folders to localStorage
const saveFoldersToStorage = (folders: Folder[]) => {
  try {
    localStorage.setItem("folders", JSON.stringify(folders));
  } catch (error) {
    console.error("Error saving folders to localStorage:", error);
  }
};

// Merge cloud and local folders data
const mergeFoldersData = (
  cloudFolders: Folder[],
  localFolders: Folder[]
): Folder[] => {
  console.log("MergeFoldersData: Starting merge process");

  // Create a map of cloud folders by ID for efficient lookup
  const cloudFoldersMap = new Map(
    cloudFolders.map((folder) => [folder.id, folder])
  );

  // Create a map of local folders by ID for efficient lookup
  const localFoldersMap = new Map(
    localFolders.map((folder) => [folder.id, folder])
  );

  const mergedFolders: Folder[] = [];

  // First, add all cloud folders (cloud data takes precedence)
  cloudFolders.forEach((cloudFolder) => {
    const localFolder = localFoldersMap.get(cloudFolder.id);

    if (localFolder) {
      // If folder exists in both cloud and local, merge conversations
      const cloudChatIds = new Set(cloudFolder.conversations.map((c) => c.id));
      const localOnlyChats = localFolder.conversations.filter(
        (c) => !cloudChatIds.has(c.id)
      );

      const mergedFolder: Folder = {
        ...cloudFolder, // Cloud data takes precedence for folder properties
        conversations: [
          ...cloudFolder.conversations,
          ...localOnlyChats, // Add local chats that aren't in cloud
        ],
      };

      mergedFolders.push(mergedFolder);
      console.log(
        `MergeFoldersData: Merged folder ${cloudFolder.name} - ${cloudFolder.conversations.length} cloud + ${localOnlyChats.length} local chats`
      );
    } else {
      // Cloud folder doesn't exist locally, just add it
      mergedFolders.push(cloudFolder);
      console.log(
        `MergeFoldersData: Added cloud-only folder ${cloudFolder.name}`
      );
    }
  });

  // Then, add local folders that don't exist in cloud
  localFolders.forEach((localFolder) => {
    if (!cloudFoldersMap.has(localFolder.id)) {
      mergedFolders.push(localFolder);
      console.log(
        `MergeFoldersData: Added local-only folder ${localFolder.name}`
      );
    }
  });

  console.log(
    `MergeFoldersData: Merge complete - ${mergedFolders.length} total folders`
  );
  return mergedFolders;
};

interface SidePanelState {
  folders: Folder[];
  selectedFolder: Folder | null;
  isOpen: boolean;
  newFolderName: string;
  selectedEmoji: string;
  editingFolder: Folder | null;
  showNewFolderModal: boolean;
  showFolderSelectionModal: boolean;
  showAddChatsModal: boolean;
  selectedChats: string[];
  searchQuery: string;
  editingFolderId: string | null;
  expandedFolders: Record<string, boolean>;
  activeDropdown: string | null;
  selectedChatForFolders: Conversation | null;
  editingFolderName: string;
  editingFolderEmoji: string;

  // Cloud storage state
  isOnline: boolean;
  syncStatus: "syncing" | "synced" | "error" | "offline";
  lastSync: Date | null;
  isCloudEnabled: boolean;

  // Actions
  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (folder: Folder) => void;
  deleteFolder: (folderId: string) => void;
  setSelectedFolder: (folder: Folder | null) => void;
  setIsOpen: (isOpen: boolean) => void;
  setNewFolderName: (name: string) => void;
  setSelectedEmoji: (emoji: string) => void;
  setEditingFolder: (folder: Folder | null) => void;
  setShowNewFolderModal: (show: boolean) => void;
  setShowFolderSelectionModal: (show: boolean) => void;
  setShowAddChatsModal: (show: boolean) => void;
  setSelectedChats: (chats: string[]) => void;
  setSearchQuery: (query: string) => void;
  handleSubmitNewFolder: () => void;
  handleSaveEdit: () => void;
  addChatsToFolder: () => Promise<void>;
  handleAddChatToFolders: () => void;
  closeAddChatsModal: () => void;
  toggleChatSelection: (chatId: string) => void;
  getAvailableChats: () => Promise<Conversation[]>;

  // New actions for FolderItem
  setEditingFolderId: (id: string | null) => void;
  toggleFolderExpansion: (folderId: string) => void;
  handleFolderOptions: (folderId: string, event: React.MouseEvent) => void;
  handleEditFolder: (folder: Folder) => void;
  handleDeleteFolder: (folderId: string) => void;
  openAddChatsModal: (folderId: string, event: React.MouseEvent) => void;
  removeChatFromFolder: (
    folderId: string,
    chatId: string,
    event?: React.MouseEvent
  ) => void;
  getFolderConversations: (folderId: string) => Conversation[];

  // New actions for FolderSelectionModal
  setSelectedChatForFolders: (chat: Conversation | null) => void;

  // New actions for NewFolderForm
  setEditingFolderName: (name: string) => void;
  setEditingFolderEmoji: (emoji: string) => void;
  handleCancelNewFolder: () => void;
  handleCancelEdit: () => void;
  updateFolderName: (folderId: string, newName: string) => void;

  // Cloud storage actions
  enableCloudStorage: () => Promise<void>;
  disableCloudStorage: () => void;
  syncToCloud: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  migrateToCloud: () => Promise<void>;
  setupCloudListeners: () => void;
  cleanupCloudListeners: () => void;
  setSyncStatus: (status: "syncing" | "synced" | "error" | "offline") => void;
  setLastSync: (date: Date | null) => void;
  setIsOnline: (online: boolean) => void;
}

export const useSidePanelStore = create<SidePanelState>((set, get) => ({
  ...loadInitialState(),
  selectedFolder: null,
  isOpen: false,
  newFolderName: "",
  selectedEmoji: "📁",
  editingFolder: null,
  showNewFolderModal: false,
  showFolderSelectionModal: false,
  showAddChatsModal: false,
  selectedChats: [],
  searchQuery: "",
  editingFolderId: null,
  expandedFolders: {},
  activeDropdown: null,
  selectedChatForFolders: null,
  editingFolderName: "",
  editingFolderEmoji: "📁",

  // Cloud storage state
  isOnline: navigator.onLine,
  syncStatus: "offline",
  lastSync: null,
  isCloudEnabled: false,

  setFolders: (folders) => {
    set({ folders });
    saveFoldersToStorage(folders);

    // Sync to cloud if enabled
    if (get().isCloudEnabled && get().isOnline) {
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        get().syncToCloud();
      }
    }
  },

  addFolder: (folder) => {
    // Check subscription limits
    const subscriptionStore = useSubscriptionStore.getState();
    const { canCreateFolder } = subscriptionStore.checkUsageLimits();

    if (!canCreateFolder) {
      // Emit event to show subscription modal
      window.dispatchEvent(
        new CustomEvent("showSubscriptionModal", {
          detail: { trigger: "limit-reached" },
        })
      );
      return;
    }

    const newFolders = [...get().folders, folder];
    set({ folders: newFolders });
    saveFoldersToStorage(newFolders);

    // Sync to cloud if enabled
    if (get().isCloudEnabled && get().isOnline) {
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        cloudStorage.saveFolder(authStore.user.uid, folder);
      }
    }

    // Update usage metrics
    subscriptionStore.updateUsageMetrics();
  },

  updateFolder: (folder) => {
    const newFolders = get().folders.map((f) =>
      f.id === folder.id ? folder : f
    );
    set({ folders: newFolders });
    saveFoldersToStorage(newFolders);

    // Sync to cloud if enabled
    if (get().isCloudEnabled && get().isOnline) {
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        cloudStorage.updateFolder(authStore.user.uid, folder);
        // Also sync the updated folders list to cloud
        get().syncToCloud();
      }
    }
  },

  deleteFolder: (folderId) => {
    const newFolders = get().folders.filter((f) => f.id !== folderId);
    set({ folders: newFolders });
    saveFoldersToStorage(newFolders);

    // Sync to cloud if enabled
    if (get().isCloudEnabled && get().isOnline) {
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        cloudStorage.deleteFolder(authStore.user.uid, folderId);
        // Also sync the updated folders list to cloud
        get().syncToCloud();
      }
    }

    // Update usage metrics after deletion
    const subscriptionStore = useSubscriptionStore.getState();
    subscriptionStore.updateUsageMetrics();
  },

  setSelectedFolder: (folder) => set({ selectedFolder: folder }),
  setIsOpen: (isOpen) => set({ isOpen }),
  setNewFolderName: (name) => set({ newFolderName: name }),
  setSelectedEmoji: (emoji) => set({ selectedEmoji: emoji }),
  setEditingFolder: (folder) => set({ editingFolder: folder }),
  setShowNewFolderModal: (show) => set({ showNewFolderModal: show }),
  setShowFolderSelectionModal: (show) =>
    set({ showFolderSelectionModal: show }),
  setShowAddChatsModal: (show) => set({ showAddChatsModal: show }),
  setSelectedChats: (chats) => set({ selectedChats: chats }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedChatForFolders: (chat) => set({ selectedChatForFolders: chat }),

  // New actions for FolderItem
  setEditingFolderId: (id) => set({ editingFolderId: id }),
  toggleFolderExpansion: (folderId) =>
    set((state) => ({
      expandedFolders: {
        ...state.expandedFolders,
        [folderId]: !state.expandedFolders[folderId],
      },
    })),
  handleFolderOptions: (folderId, event) => {
    event.stopPropagation();
    set((state) => ({
      activeDropdown: state.activeDropdown === folderId ? null : folderId,
    }));
  },
  handleEditFolder: (folder) => {
    set({
      editingFolder: folder,
      editingFolderId: folder.id,
      newFolderName: folder.name,
      selectedEmoji: folder.emoji,
    });
  },
  updateFolderName: (folderId: string, newName: string) => {
    const folder = get().folders.find((f) => f.id === folderId);
    if (folder && newName.trim() !== "" && newName.trim() !== folder.name) {
      const updatedFolder: Folder = {
        ...folder,
        name: newName.trim(),
      };
      get().updateFolder(updatedFolder);
    }
  },
  handleDeleteFolder: (folderId) => {
    get().deleteFolder(folderId);
    set({ activeDropdown: null });
  },
  openAddChatsModal: (folderId, event) => {
    console.log(`Store: openAddChatsModal called with folderId = ${folderId}`);
    // Safely call stopPropagation if it exists
    if (event && typeof event.stopPropagation === "function") {
      event.stopPropagation();
    }
    const folder = get().folders.find((f) => f.id === folderId);
    if (folder) {
      console.log(`Store: Found folder ${folder.name} with ID ${folder.id}`);
      set({ selectedFolder: folder, showAddChatsModal: true });
      console.log(`Store: Set selectedFolder and showAddChatsModal = true`);
    } else {
      console.error(`Store: Folder with ID ${folderId} not found`);
    }
  },
  removeChatFromFolder: (folderId, chatId, event?: React.MouseEvent) => {
    // Safely call stopPropagation if it exists
    if (event && typeof event.stopPropagation === "function") {
      event.stopPropagation();
    }

    console.log(`Store: Removing chat ${chatId} from folder ${folderId}`);

    const folder = get().folders.find((f) => f.id === folderId);
    if (folder) {
      console.log(
        `Store: Found folder ${folder.name} with ${folder.conversations.length} conversations`
      );

      const updatedFolder: Folder = {
        ...folder,
        conversations: folder.conversations.filter(
          (conv) => conv.id !== chatId
        ),
      };

      console.log(
        `Store: Updated folder now has ${updatedFolder.conversations.length} conversations`
      );

      // Update the folder in the store
      get().updateFolder(updatedFolder);

      // Save to localStorage
      const updatedFolders = get().folders.map((f) =>
        f.id === folderId ? updatedFolder : f
      );
      saveFoldersToStorage(updatedFolders);

      console.log(`Store: Saved updated folders to localStorage`);

      // Sync to cloud if enabled
      if (get().isCloudEnabled && get().isOnline) {
        const authStore = useAuthStore.getState();
        if (authStore.user) {
          cloudStorage.updateFolder(authStore.user.uid, updatedFolder);
          // Also sync the updated folders list to cloud
          get().syncToCloud();
        }
      }

      // Update usage metrics after removing chat
      const subscriptionStore = useSubscriptionStore.getState();
      subscriptionStore.updateUsageMetrics();
    } else {
      console.log(`Store: Folder ${folderId} not found`);
    }
  },
  getFolderConversations: (folderId) => {
    const folder = get().folders.find((f) => f.id === folderId);
    return folder ? folder.conversations : [];
  },

  closeAddChatsModal: () => set({ showAddChatsModal: false }),
  toggleChatSelection: (chatId) =>
    set((state) => ({
      selectedChats: state.selectedChats.includes(chatId)
        ? state.selectedChats.filter((id) => id !== chatId)
        : [...state.selectedChats, chatId],
    })),
  getAvailableChats: () => {
    const { folders, selectedFolder } = get();
    console.log("getAvailableChats: Function called");
    console.log("getAvailableChats: selectedFolder =", selectedFolder);
    console.log("getAvailableChats: folders count =", folders.length);

    if (!selectedFolder) {
      console.log(
        "getAvailableChats: No selectedFolder, returning empty array"
      );
      return Promise.resolve([]);
    }

    // Get all chat IDs that are already in the CURRENT folder (not all folders)
    const existingChatIds = new Set(
      selectedFolder.conversations.map((conv) => conv.id)
    );
    console.log(
      "getAvailableChats: Existing chat IDs in current folder:",
      Array.from(existingChatIds)
    );

    console.log("getAvailableChats: Starting to load all chats...");

    // Function to load all chats by scrolling
    const loadAllChats = async (): Promise<Element[]> => {
      return new Promise((resolve) => {
        // Find the chat list container
        const chatListContainer =
          document.querySelector('nav[class*="flex-col"]') ||
          document.querySelector('[role="navigation"]') ||
          document.querySelector('[class*="sidebar"]');

        console.log(
          "getAvailableChats: Chat list container found:",
          !!chatListContainer
        );

        if (!chatListContainer) {
          console.log("No chat list container found");
          resolve([]);
          return;
        }

        console.log("Starting to load all chats by scrolling...");

        let previousHeight = 0;
        let scrollAttempts = 0;
        const maxScrollAttempts = 50; // Prevent infinite scrolling
        const scrollInterval = 100; // Scroll every 100ms

        const scrollToLoad = () => {
          // Scroll to the bottom of the chat list
          chatListContainer.scrollTop = chatListContainer.scrollHeight;

          // Check if we've reached the bottom (no more content to load)
          const currentHeight = chatListContainer.scrollHeight;

          if (
            currentHeight === previousHeight ||
            scrollAttempts >= maxScrollAttempts
          ) {
            console.log(
              `Finished loading chats. Height: ${currentHeight}, Attempts: ${scrollAttempts}`
            );

            // Wait a bit more for any final loading to complete
            setTimeout(() => {
              // Now collect all the chat links
              const allChatLinks = collectAllChatLinks();
              console.log(
                "getAvailableChats: Collected chat links after scrolling:",
                allChatLinks.length
              );
              resolve(allChatLinks);
            }, 500);

            return;
          }

          previousHeight = currentHeight;
          scrollAttempts++;

          // Continue scrolling
          setTimeout(scrollToLoad, scrollInterval);
        };

        // Start the scrolling process
        scrollToLoad();
      });
    };

    // Function to collect all chat links after scrolling
    const collectAllChatLinks = (): Element[] => {
      console.log("getAvailableChats: collectAllChatLinks called");

      // More comprehensive selectors to find chat links
      const chatSelectors = [
        'a[href^="/c/"]', // Standard chat links
        'a[href*="/c/"]', // Any link containing /c/
        '[data-testid*="chat"] a[href*="/c/"]', // Chat links in test containers
        'nav a[href*="/c/"]', // Chat links in navigation
        '.group a[href*="/c/"]', // Chat links in group containers
        'a[class*="group"]', // Links with group class
        "a[data-fill]", // Links with data-fill attribute (like in your snippet)
        'a[class*="__menu-item"]', // Menu item links
        'a[class*="hoverable"]', // Hoverable links
        'a[class*="truncate"]', // Links with truncate class
        'a[class*="flex"]', // Links with flex class
        'a[class*="min-w-0"]', // Links with min-w-0 class
        'a[class*="grow"]', // Links with grow class
        'a[class*="items-center"]', // Links with items-center class
        'a[class*="gap-2.5"]', // Links with gap-2.5 class
      ];

      let allChatLinks: Element[] = [];

      // Collect all chat links from different selectors
      chatSelectors.forEach((selector) => {
        try {
          const links = Array.from(document.querySelectorAll(selector));
          console.log(
            `getAvailableChats: Selector "${selector}" found ${links.length} links`
          );
          allChatLinks = [...allChatLinks, ...links];
        } catch (error) {
          console.warn(`Failed to query selector: ${selector}`, error);
        }
      });

      // Also try to find all links in the navigation area
      const navElements = document.querySelectorAll(
        'nav, [role="navigation"], [class*="sidebar"], [class*="nav"]'
      );
      console.log("getAvailableChats: Found nav elements:", navElements.length);

      navElements.forEach((nav) => {
        try {
          const navLinks = Array.from(nav.querySelectorAll('a[href*="/c/"]'));
          console.log(
            `getAvailableChats: Nav element found ${navLinks.length} chat links`
          );
          allChatLinks = [...allChatLinks, ...navLinks];
        } catch (error) {
          console.warn(`Failed to query nav element:`, error);
        }
      });

      // Remove duplicates based on href
      const uniqueLinks = allChatLinks.filter((link, index, self) => {
        const href = link.getAttribute("href");
        return (
          href &&
          self.findIndex((l) => l.getAttribute("href") === href) === index
        );
      });

      console.log(
        `Found ${uniqueLinks.length} unique chat links in DOM after scrolling`
      );

      return uniqueLinks;
    };

    // Use the async function to load all chats
    return new Promise<Conversation[]>((resolve) => {
      // Add a timeout to prevent infinite waiting
      const timeout = setTimeout(() => {
        console.log(
          "getAvailableChats: Timeout reached, using fallback method"
        );
        const fallbackLinks = collectAllChatLinks();
        const fallbackChats = processChatLinks(fallbackLinks);
        resolve(fallbackChats);
      }, 15000); // 15 second timeout

      loadAllChats()
        .then((uniqueLinks) => {
          clearTimeout(timeout);
          const availableChats = processChatLinks(uniqueLinks);
          console.log(
            `Available chats for folder "${selectedFolder.name}":`,
            availableChats.length
          );
          resolve(availableChats);
        })
        .catch((error) => {
          clearTimeout(timeout);
          console.error(
            "getAvailableChats: Error during scrolling, using fallback:",
            error
          );
          const fallbackLinks = collectAllChatLinks();
          const fallbackChats = processChatLinks(fallbackLinks);
          resolve(fallbackChats);
        });
    });

    // Helper function to process chat links
    function processChatLinks(uniqueLinks: Element[]): Conversation[] {
      console.log(
        "getAvailableChats: processChatLinks called with",
        uniqueLinks.length,
        "links"
      );

      const processedChats = uniqueLinks
        .map((link) => {
          const href = link.getAttribute("href");
          if (!href) {
            console.log("getAvailableChats: Link has no href, skipping");
            return null;
          }

          // Extract chat ID from various URL patterns
          const chatIdMatch = href.match(/\/c\/([^\/\?]+)/);
          if (!chatIdMatch) {
            console.log(
              "getAvailableChats: Link href doesn't match chat pattern:",
              href
            );
            return null;
          }

          const chatId = chatIdMatch[1];
          if (!chatId) {
            console.log(
              "getAvailableChats: No chat ID extracted from href:",
              href
            );
            return null;
          }

          if (existingChatIds.has(chatId)) {
            console.log(
              "getAvailableChats: Chat ID already in current folder, skipping:",
              chatId
            );
            return null;
          }

          // Try to get the title from multiple sources
          let title = link.textContent?.trim();

          // If no text content, try to find title in child elements
          if (!title || title === chatId) {
            // Look for title in various child elements
            const titleSelectors = [
              "[title]",
              "[data-title]",
              ".title",
              ".chat-title",
              ".truncate",
              "span",
              "div",
              "[class*='truncate']",
              "[class*='title']",
            ];

            for (const selector of titleSelectors) {
              const titleElement = link.querySelector(selector);
              if (titleElement) {
                const elementTitle =
                  titleElement.getAttribute("title") ||
                  titleElement.getAttribute("data-title") ||
                  titleElement.textContent?.trim();

                if (
                  elementTitle &&
                  elementTitle !== chatId &&
                  elementTitle.length > 0
                ) {
                  title = elementTitle;
                  break;
                }
              }
            }
          }

          // Also try to get title from the link's own attributes
          if (!title || title === chatId) {
            title =
              link.getAttribute("title") ||
              link.getAttribute("data-title") ||
              link.getAttribute("aria-label") ||
              undefined;
          }

          // Fallback to a formatted chat ID if no title found
          if (!title || title === chatId) {
            title = `Chat ${chatId}`;
          }

          // Find which folders this chat is already in
          const folderIds = folders
            .filter((folder) =>
              folder.conversations.some((conv) => conv.id === chatId)
            )
            .map((folder) => folder.id);

          console.log(
            `Found chat: ${title} (${chatId}) - In folders: ${folderIds.join(
              ", "
            )}`
          );

          const conversation: Conversation = {
            id: chatId,
            title,
            url: `/c/${chatId}`,
            preview: "",
            platform: "chatgpt" as Platform,
            timestamp: Date.now(),
          };

          // Only add folderIds if the chat is in any folders
          if (folderIds.length > 0) {
            conversation.folderIds = folderIds;
          }

          return conversation;
        })
        .filter((chat): chat is Conversation => chat !== null);

      console.log(
        "getAvailableChats: processChatLinks returning",
        processedChats.length,
        "chats"
      );
      return processedChats;
    }
  },

  handleSubmitNewFolder: () => {
    const { newFolderName, selectedEmoji } = get();
    if (!newFolderName.trim()) return;

    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      emoji: selectedEmoji,
      conversations: [],
      createdAt: Date.now(),
    };

    get().addFolder(newFolder);
    set({ newFolderName: "", showNewFolderModal: false });
  },

  handleSaveEdit: () => {
    const { editingFolder, newFolderName, selectedEmoji } = get();
    if (!editingFolder || !newFolderName.trim()) return;

    const updatedFolder: Folder = {
      ...editingFolder,
      name: newFolderName.trim(),
      emoji: selectedEmoji,
    };

    get().updateFolder(updatedFolder);
    set({ editingFolder: null, newFolderName: "", showNewFolderModal: false });
  },

  addChatsToFolder: async () => {
    const { selectedFolder, selectedChats } = get();
    if (!selectedFolder) return;

    // Check subscription limits
    const subscriptionStore = useSubscriptionStore.getState();
    const { canAddChat } = subscriptionStore.checkUsageLimits();

    if (!canAddChat) {
      // Emit event to show subscription modal
      window.dispatchEvent(
        new CustomEvent("showSubscriptionModal", {
          detail: { trigger: "limit-reached" },
        })
      );
      return;
    }

    // Filter out chats that already exist in the folder
    const existingChatIds = new Set(
      selectedFolder.conversations.map((conv) => conv.id)
    );
    const newChats = selectedChats.filter(
      (chatId) => !existingChatIds.has(chatId)
    );

    if (newChats.length === 0) {
      console.log(
        "No new chats to add to folder - all selected chats already exist in the folder"
      );
      set({ selectedChats: [], showAddChatsModal: false });
      return;
    }

    console.log(
      `Adding ${newChats.length} new chats to folder ${selectedFolder.id}`
    );

    try {
      // Get the available chats to get their titles
      const availableChats = await get().getAvailableChats();
      const availableChatsMap = new Map(
        availableChats.map((chat) => [chat.id, chat])
      );

      const updatedFolder: Folder = {
        ...selectedFolder,
        conversations: [
          ...selectedFolder.conversations,
          ...newChats.map((chatId) => {
            // Try to get the chat info from available chats
            const availableChat = availableChatsMap.get(chatId);
            if (availableChat) {
              return {
                id: chatId,
                title: availableChat.title,
                url: availableChat.url,
                preview: availableChat.preview,
                platform: availableChat.platform,
                timestamp: availableChat.timestamp,
              };
            } else {
              // Fallback to generic title if not found
              return {
                id: chatId,
                title: `Chat ${chatId}`,
                url: `/c/${chatId}`,
                preview: "",
                platform: "chatgpt" as Platform,
                timestamp: Date.now(),
              };
            }
          }),
        ],
      };

      // Update the folder in the store
      get().updateFolder(updatedFolder);

      // Update the selectedFolder to reflect the new state
      set({
        selectedFolder: updatedFolder,
        selectedChats: [],
        showAddChatsModal: false,
      });

      // Update usage metrics
      subscriptionStore.updateUsageMetrics();
    } catch (error) {
      console.error("Error adding chats to folder:", error);
      // Still close the modal even if there's an error
      set({ selectedChats: [], showAddChatsModal: false });
    }
  },

  handleAddChatToFolders: () => {
    const { folders, selectedChatForFolders } = get();
    if (!selectedChatForFolders?.folderIds?.length) return;

    const updatedFolders = folders.map((folder) => {
      if (selectedChatForFolders.folderIds?.includes(folder.id)) {
        // Check if the chat already exists in this folder
        const chatExists = folder.conversations.some(
          (conv) => conv.id === selectedChatForFolders.id
        );

        // Only add the chat if it doesn't already exist in the folder
        if (!chatExists) {
          console.log(
            `Adding chat ${selectedChatForFolders.id} to folder ${folder.id}`
          );
          return {
            ...folder,
            conversations: [
              ...folder.conversations,
              {
                id: selectedChatForFolders.id,
                title: selectedChatForFolders.title,
                url: selectedChatForFolders.url,
                preview: selectedChatForFolders.preview,
                platform: selectedChatForFolders.platform,
                timestamp: selectedChatForFolders.timestamp,
              },
            ],
          };
        } else {
          console.log(
            `Chat ${selectedChatForFolders.id} already exists in folder ${folder.id}`
          );
        }
      }
      return folder;
    });

    set({
      folders: updatedFolders,
      selectedChatForFolders: null,
      showFolderSelectionModal: false,
    });
    saveFoldersToStorage(updatedFolders);

    // Sync to cloud if enabled
    if (get().isCloudEnabled && get().isOnline) {
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        // Sync all updated folders to cloud
        get().syncToCloud();
      }
    }

    // Update usage metrics
    const subscriptionStore = useSubscriptionStore.getState();
    subscriptionStore.updateUsageMetrics();
  },

  setEditingFolderName: (name) => set({ editingFolderName: name }),
  setEditingFolderEmoji: (emoji) => set({ editingFolderEmoji: emoji }),
  handleCancelNewFolder: () =>
    set({ newFolderName: "", showNewFolderModal: false }),
  handleCancelEdit: () =>
    set({
      editingFolder: null,
      editingFolderName: "",
      editingFolderEmoji: "📁",
      showNewFolderModal: false,
    }),

  // Cloud storage actions
  enableCloudStorage: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.isAuthenticated) {
      throw new Error("User must be authenticated to enable cloud storage");
    }

    set({ isCloudEnabled: true, syncStatus: "syncing" });

    try {
      console.log("EnableCloudStorage: Starting cloud sync process");

      // First, get existing cloud data
      const cloudFolders = await cloudStorage.getUserFolders(
        authStore.user!.uid
      );
      console.log(
        "EnableCloudStorage: Found",
        cloudFolders.length,
        "folders in cloud"
      );

      // Get local data
      const localFolders = get().folders;
      console.log(
        "EnableCloudStorage: Found",
        localFolders.length,
        "local folders"
      );

      // Merge cloud and local data (cloud data takes precedence if there are conflicts)
      const mergedFolders = mergeFoldersData(cloudFolders, localFolders);
      console.log(
        "EnableCloudStorage: Merged to",
        mergedFolders.length,
        "folders"
      );

      // Update local state with merged data
      set({ folders: mergedFolders });
      saveFoldersToStorage(mergedFolders);

      // Sync merged data back to cloud to ensure consistency
      await cloudStorage.syncToCloud(authStore.user!.uid, mergedFolders);
      await cloudStorage.updateLastSync(authStore.user!.uid);

      // Set up real-time listeners
      get().setupCloudListeners();

      set({ syncStatus: "synced", lastSync: new Date() });
      console.log(
        "EnableCloudStorage: Successfully enabled cloud storage and synced data"
      );
    } catch (error) {
      console.error("Error enabling cloud storage:", error);
      set({ syncStatus: "error" });
      throw error;
    }
  },

  disableCloudStorage: () => {
    get().cleanupCloudListeners();
    set({ isCloudEnabled: false, syncStatus: "offline" });
  },

  syncToCloud: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user || !get().isCloudEnabled) return;

    set({ syncStatus: "syncing" });

    try {
      await cloudStorage.syncToCloud(authStore.user.uid, get().folders);
      await cloudStorage.updateLastSync(authStore.user.uid);
      set({ syncStatus: "synced", lastSync: new Date() });
    } catch (error) {
      console.error("Error syncing to cloud:", error);
      set({ syncStatus: "error" });
    }
  },

  syncFromCloud: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user || !get().isCloudEnabled) return;

    set({ syncStatus: "syncing" });

    try {
      const cloudFolders = await cloudStorage.getUserFolders(
        authStore.user.uid
      );
      set({ folders: cloudFolders });
      saveFoldersToStorage(cloudFolders);
      set({ syncStatus: "synced", lastSync: new Date() });
    } catch (error) {
      console.error("Error syncing from cloud:", error);
      set({ syncStatus: "error" });
    }
  },

  migrateToCloud: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) return;

    try {
      const localFolders = get().folders;
      await cloudStorage.migrateToCloud(authStore.user.uid, localFolders);
      await cloudStorage.updateLastSync(authStore.user.uid);
      set({ lastSync: new Date() });
    } catch (error) {
      console.error("Error migrating to cloud:", error);
      throw error;
    }
  },

  setupCloudListeners: () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) return;

    try {
      // Set up real-time listener for all folders
      cloudStorage.setupFoldersListener(authStore.user.uid, (folders) => {
        set({ folders });
        saveFoldersToStorage(folders);
        set({ lastSync: new Date() });
      });
    } catch (error) {
      console.error("Error setting up cloud listeners:", error);
    }
  },

  cleanupCloudListeners: () => {
    cloudStorage.cleanup();
  },

  setSyncStatus: (status) => set({ syncStatus: status }),
  setLastSync: (date) => set({ lastSync: date }),
  setIsOnline: (online) => set({ isOnline: online }),
}));
