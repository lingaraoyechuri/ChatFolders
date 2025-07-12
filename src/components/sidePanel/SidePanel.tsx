import React, { useState, useEffect } from "react";
import { useSidePanelStore } from "../../store/sidePanelStore";
import { FolderItem } from "./FolderItem";
import { FolderListComponent } from "./FolderFeature";
import { SidePanelProps } from "../../types/sidePanel";
import { Folder } from "../../types/sidePanel";
import * as S from "../../styles/sidePanel";
import { NewFolderModal } from "./NewFolderModal";
import { AddChatsModal } from "./AddChatsModal";

export const SidePanel: React.FC<SidePanelProps> = ({
  isOpen,
  onClose,
  platform,
  currentChatId,
}) => {
  const {
    folders,
    selectedFolder,
    isOpen: isSidePanelOpen,
    setIsOpen,
    setSelectedFolder,
    setShowNewFolderModal,
    setShowFolderSelectionModal,
    setShowAddChatsModal,
    setSelectedChats,
    setSearchQuery,
    setEditingFolderId,
    toggleFolderExpansion,
    handleFolderOptions,
    handleEditFolder: storeHandleEditFolder,
    handleDeleteFolder: storeHandleDeleteFolder,
    openAddChatsModal,
    removeChatFromFolder,
    getFolderConversations,
    setSelectedChatForFolders,
    setEditingFolderName,
    setEditingFolderEmoji,
    handleCancelNewFolder,
    handleCancelEdit,
  } = useSidePanelStore();

  // State to track the current chat ID
  const [localCurrentChatId, setLocalCurrentChatId] = useState<string | null>(
    null
  );

  // Use the prop if provided, otherwise use the local state
  const effectiveCurrentChatId = currentChatId || localCurrentChatId;

  // Ensure we always pass a valid string or undefined
  // If we have a currentChatId prop, always use it
  // If we don't have a currentChatId prop but have a localCurrentChatId, use that
  // Only set to undefined if both are falsy
  const finalCurrentChatId =
    typeof currentChatId === "string" && currentChatId.trim() !== ""
      ? currentChatId
      : typeof localCurrentChatId === "string" &&
        localCurrentChatId.trim() !== ""
      ? localCurrentChatId
      : undefined;

  // Add event listener for chat navigation
  React.useEffect(() => {
    const handleChatNavigation = (event: CustomEvent) => {
      const { chatId, folderId } = event.detail;
      setLocalCurrentChatId(chatId);
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

    // Initialize currentChatId from URL on component mount
    const initialChatId = extractChatIdFromUrl();
    if (initialChatId) {
      setLocalCurrentChatId(initialChatId);
    }

    return () => {
      window.removeEventListener(
        "chatNavigation",
        handleChatNavigation as EventListener
      );
    };
  }, []);

  // Function to handle chat selection
  const handleSelectChat = (chatId: string, folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      const chat = folder.conversations.find((c) => c.id === chatId);
      if (chat) {
        setSelectedChatForFolders(chat);
        setLocalCurrentChatId(chatId);
      }
    }
  };

  // Function to handle editing a folder
  const handleEditFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      storeHandleEditFolder(folder);
    }
  };

  // Function to handle deleting a folder
  const handleDeleteFolder = (folderId: string) => {
    // The store's handleDeleteFolder only takes a folderId parameter
    storeHandleDeleteFolder(folderId);
  };

  // Function to handle adding chats to a folder
  const handleAddChats = (folderId: string) => {
    // Create a synthetic event object
    const syntheticEvent = {
      stopPropagation: () => {},
      preventDefault: () => {},
    } as React.MouseEvent;

    // Find the folder
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      openAddChatsModal(folderId, syntheticEvent);
    } else {
      console.error(`SidePanel: Folder with ID ${folderId} not found`);
    }
  };

  // Function to handle removing a chat from a folder
  const handleRemoveChat = (folderId: string, chatId: string) => {
    removeChatFromFolder(folderId, chatId);
  };

  return (
    <S.SidePanelContainer isOpen={isOpen}>
      <S.Header>
        <S.Title>Folders</S.Title>
        <S.NewFolderButton onClick={() => setShowNewFolderModal(true)}>
          <span className="text-lg">📁</span>
          <span>New Folder</span>
        </S.NewFolderButton>
      </S.Header>

      <S.FolderList>
        {folders.length > 0 ? (
          <FolderListComponent
            folders={folders}
            onEditFolder={handleEditFolder}
            onDeleteFolder={handleDeleteFolder}
            onAddChats={handleAddChats}
            onSelectChat={handleSelectChat}
            onRemoveChat={handleRemoveChat}
            currentChatId={finalCurrentChatId}
          />
        ) : (
          <S.EmptyState>
            <span className="text-lg">📁</span>
            <span>No folders yet</span>
          </S.EmptyState>
        )}
      </S.FolderList>

      <NewFolderModal />
      {selectedFolder && <AddChatsModal folder={selectedFolder} />}
    </S.SidePanelContainer>
  );
};
