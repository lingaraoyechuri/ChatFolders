import React from "react";
import { useSidePanelStore } from "../../store/sidePanelStore";
import { FolderItem } from "./FolderItem";
import { NewFolderModal } from "./NewFolderModal";
import * as S from "../../styles/sidePanel";
import { FolderListComponent } from "./FolderFeature";

export const SidePanel: React.FC = () => {
  const {
    isOpen,
    folders,
    showNewFolderModal,
    setShowNewFolderModal,
    setEditingFolderId,
    handleDeleteFolder,
    setShowAddChatsModal,
    setSelectedFolder,
    setSelectedChatForFolders,
    removeChatFromFolder,
  } = useSidePanelStore();

  // Function to handle chat selection
  const handleSelectChat = (chatId: string, folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      const chat = folder.conversations.find((c) => c.id === chatId);
      if (chat) {
        setSelectedChatForFolders(chat);
      }
    }
  };

  // Function to handle editing a folder
  const handleEditFolder = (folderId: string) => {
    setEditingFolderId(folderId);
  };

  // Function to handle adding chats to a folder
  const handleAddChats = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      setSelectedFolder(folder);
      setShowAddChatsModal(true);
    }
  };

  // Function to handle removing a chat from a folder
  const handleRemoveChat = (folderId: string, chatId: string) => {
    console.log(`SidePanel: Removing chat ${chatId} from folder ${folderId}`);

    // Call the store's removeChatFromFolder function directly
    // We don't need to create a synthetic event since we're handling it in the store
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
          />
        ) : (
          <S.EmptyState>
            <span className="text-lg">📁</span>
            <span>No folders yet</span>
          </S.EmptyState>
        )}
      </S.FolderList>

      <NewFolderModal />
    </S.SidePanelContainer>
  );
};
