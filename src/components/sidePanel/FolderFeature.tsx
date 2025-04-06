import React, { useState } from "react";
import styled from "styled-components";
import { Folder } from "../../types/sidePanel";
import { useSidePanelStore } from "../../store/sidePanelStore"; // Import the store

// Styled components
const FolderContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const NewFolderButton = styled.button`
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background-color: rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  margin-bottom: 12px;
  border: none;
  color: #0d0d0d;
  cursor: pointer;
  width: 100%;
  text-align: left;
  height: 36px;
  gap: 12px;
  transition: transform 0.1s, box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const FolderIcon = styled.span`
  font-size: 20px;
  font-weight: bold;
`;

const FolderCard = styled.div<{ isActive?: boolean }>`
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background-color: #1e1f23;
  margin-bottom: 12px;
  overflow: hidden;
`;

const FolderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
`;

const FolderTitle = styled.div`
  display: flex;
  align-items: center;
  color: white;
  font-weight: 500;
`;

const FolderEmoji = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 20px;
  width: 24px;
  height: 24px;
`;

const FolderName = styled.span`
  font-size: 14px;
`;

const FolderCount = styled.span`
  margin-left: 8px;
  color: #9ca3af;
  font-size: 12px;
`;

const FolderActions = styled.div`
  position: relative;
`;

const MoreButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  font-size: 16px;

  &:hover {
    color: white;
  }
`;

const ChatsContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 8px 8px 8px;
`;

const ChatItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  color: #d1d5db;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.07);
  }
`;

const ChatTitle = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  ${ChatItem}:hover & {
    opacity: 1;
  }

  &:hover {
    color: #ef4444;
  }
`;

const Dropdown = styled.div`
  position: absolute;
  right: 0;
  top: 30px;
  background-color: #2d2d33;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 10;
  width: 160px;
`;

const DropdownItem = styled.div`
  padding: 10px 16px;
  cursor: pointer;
  color: #d1d5db;

  &:hover {
    background-color: rgba(255, 255, 255, 0.07);
  }
`;

// Interface for dropdown props
export interface DropdownProps {
  folder: Folder;
  onEdit: () => void;
  onDelete: () => void;
  onAddChats: () => void;
}

// Dropdown Component
export const FolderDropdown: React.FC<DropdownProps> = ({
  onEdit,
  onDelete,
  onAddChats,
}) => {
  return (
    <Dropdown>
      <DropdownItem onClick={onEdit}>Edit folder</DropdownItem>
      <DropdownItem onClick={onAddChats}>Add chats</DropdownItem>
      <DropdownItem onClick={onDelete}>Delete folder</DropdownItem>
    </Dropdown>
  );
};

// Props for folder component
interface FolderComponentProps {
  folder: Folder;
  onEditFolder?: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onAddChats?: (folderId: string) => void;
  onSelectChat?: (chatId: string, folderId: string) => void;
  onRemoveChat?: (folderId: string, chatId: string) => void;
}

// Individual Folder Component
export const FolderComponent: React.FC<FolderComponentProps> = ({
  folder,
  onEditFolder,
  onDeleteFolder,
  onAddChats,
  onSelectChat,
  onRemoveChat,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleToggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleEdit = () => {
    setShowDropdown(false);
    onEditFolder?.(folder.id);
  };

  const handleDelete = () => {
    setShowDropdown(false);
    onDeleteFolder?.(folder.id);
  };

  const handleAddChats = () => {
    setShowDropdown(false);
    onAddChats?.(folder.id);
  };

  const handleChatClick = (chatId: string) => {
    onSelectChat?.(chatId, folder.id);
  };

  const handleRemoveChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    console.log(
      `FolderComponent: Removing chat ${chatId} from folder ${folder.id}`
    );

    // Make sure we're passing the folder ID and chat ID correctly
    if (onRemoveChat) {
      onRemoveChat(folder.id, chatId);
    } else {
      console.error("onRemoveChat function is not defined");
    }
  };

  return (
    <FolderCard>
      <FolderHeader onClick={handleToggleExpand}>
        <FolderTitle>
          <FolderEmoji>{folder.emoji}</FolderEmoji>
          <FolderName>{folder.name}</FolderName>
          <FolderCount>{folder.conversations.length} chats saved</FolderCount>
        </FolderTitle>
        <FolderActions>
          <MoreButton onClick={handleToggleDropdown}>···</MoreButton>
          {showDropdown && (
            <FolderDropdown
              folder={folder}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddChats={handleAddChats}
            />
          )}
        </FolderActions>
      </FolderHeader>

      {isExpanded && (
        <ChatsContainer>
          {folder.conversations.map((chat) => (
            <ChatItem key={chat.id} onClick={() => handleChatClick(chat.id)}>
              <ChatTitle>{chat.title}</ChatTitle>
              <RemoveButton onClick={(e) => handleRemoveChat(e, chat.id)}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 4L4 12M4 4L12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </RemoveButton>
            </ChatItem>
          ))}
        </ChatsContainer>
      )}
    </FolderCard>
  );
};

// Props for the new folder button
interface NewFolderButtonProps {
  onClick: () => void;
  label?: string;
}

// New Folder Button Component
export const NewFolderButtonComponent: React.FC<NewFolderButtonProps> = ({
  onClick,
  label = "New Folder",
}) => {
  const { setShowNewFolderModal } = useSidePanelStore(); // Get the action from the store

  const handleClick = () => {
    setShowNewFolderModal(true); // Open the NewFolderForm
    onClick();
  };

  return (
    <NewFolderButton onClick={handleClick}>
      <FolderIcon>+</FolderIcon>
      {label}
    </NewFolderButton>
  );
};

// Props for folder list
interface FolderListProps {
  folders: Folder[];
  onEditFolder?: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onAddChats?: (folderId: string) => void;
  onSelectChat?: (chatId: string, folderId: string) => void;
  onRemoveChat?: (folderId: string, chatId: string) => void;
}

// Folder List Component
export const FolderListComponent: React.FC<FolderListProps> = ({
  folders,
  onEditFolder,
  onDeleteFolder,
  onAddChats,
  onSelectChat,
  onRemoveChat,
}) => {
  return (
    <FolderContainer>
      {folders.map((folder) => (
        <FolderComponent
          key={folder.id}
          folder={folder}
          onEditFolder={onEditFolder}
          onDeleteFolder={onDeleteFolder}
          onAddChats={onAddChats}
          onSelectChat={onSelectChat}
          onRemoveChat={onRemoveChat}
        />
      ))}
    </FolderContainer>
  );
};
