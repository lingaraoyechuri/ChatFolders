import { create } from "zustand";
import { Folder, Conversation, Platform } from "../types/sidePanel";

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
  addChatsToFolder: () => void;
  handleAddChatToFolders: () => void;
  closeAddChatsModal: () => void;
  toggleChatSelection: (chatId: string) => void;
  getAvailableChats: () => Conversation[];
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
    event: React.MouseEvent
  ) => void;
  getFolderConversations: (folderId: string) => Conversation[];
  // New actions for FolderSelectionModal
  setSelectedChatForFolders: (chat: Conversation | null) => void;
  // New actions for NewFolderForm
  setEditingFolderName: (name: string) => void;
  setEditingFolderEmoji: (emoji: string) => void;
  handleCancelNewFolder: () => void;
  handleCancelEdit: () => void;
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

  setFolders: (folders) => {
    set({ folders });
    saveFoldersToStorage(folders);
  },
  addFolder: (folder) => {
    const newFolders = [...get().folders, folder];
    set({ folders: newFolders });
    saveFoldersToStorage(newFolders);
  },
  updateFolder: (folder) => {
    const newFolders = get().folders.map((f) =>
      f.id === folder.id ? folder : f
    );
    set({ folders: newFolders });
    saveFoldersToStorage(newFolders);
  },
  deleteFolder: (folderId) => {
    const newFolders = get().folders.filter((f) => f.id !== folderId);
    set({ folders: newFolders });
    saveFoldersToStorage(newFolders);
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
  handleDeleteFolder: (folderId) => {
    get().deleteFolder(folderId);
    set({ activeDropdown: null });
  },
  openAddChatsModal: (folderId, event) => {
    event.stopPropagation();
    const folder = get().folders.find((f) => f.id === folderId);
    if (folder) {
      set({ selectedFolder: folder, showAddChatsModal: true });
    }
  },
  removeChatFromFolder: (folderId, chatId, event) => {
    event.stopPropagation();
    const folder = get().folders.find((f) => f.id === folderId);
    if (folder) {
      const updatedFolder: Folder = {
        ...folder,
        conversations: folder.conversations.filter(
          (conv) => conv.id !== chatId
        ),
      };
      get().updateFolder(updatedFolder);
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
    if (!selectedFolder) return [];

    // Get all chat IDs that are already in any folder
    const existingChatIds = new Set(
      folders.flatMap((folder) => folder.conversations.map((conv) => conv.id))
    );

    // Get all chat links from the page
    const chatLinks = Array.from(document.querySelectorAll('a[href^="/c/"]'));

    // Create Conversation objects for each chat
    return chatLinks
      .map((link) => {
        const chatId = link.getAttribute("href")?.split("/c/")[1];
        if (!chatId || existingChatIds.has(chatId)) return null;

        const title = link.textContent?.trim() || `Chat ${chatId}`;
        return {
          id: chatId,
          title,
          url: `/c/${chatId}`,
          preview: "",
          platform: "chatgpt" as Platform,
          timestamp: Date.now(),
        };
      })
      .filter((chat): chat is Conversation => chat !== null);
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

  addChatsToFolder: () => {
    const { selectedFolder, selectedChats } = get();
    if (!selectedFolder) return;

    const updatedFolder: Folder = {
      ...selectedFolder,
      conversations: [
        ...selectedFolder.conversations,
        ...selectedChats.map((chatId) => ({
          id: chatId,
          title: `Chat ${chatId}`,
          url: `/c/${chatId}`,
          preview: "",
          platform: "chatgpt" as Platform,
          timestamp: Date.now(),
        })),
      ],
    };

    get().updateFolder(updatedFolder);
    set({ selectedChats: [], showAddChatsModal: false });
  },

  handleAddChatToFolders: () => {
    const { folders, selectedChatForFolders } = get();
    if (!selectedChatForFolders?.folderIds?.length) return;

    const updatedFolders = folders.map((folder) => {
      if (selectedChatForFolders.folderIds?.includes(folder.id)) {
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
      }
      return folder;
    });

    set({
      folders: updatedFolders,
      selectedChatForFolders: null,
      showFolderSelectionModal: false,
    });
    saveFoldersToStorage(updatedFolders);
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
}));
