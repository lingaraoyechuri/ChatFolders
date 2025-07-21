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
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FolderNameInput = styled.input`
  font-size: 14px;
  color: white;
  background-color: #2d2d33;
  border: 1px solid #37373d;
  border-radius: 4px;
  padding: 4px 8px;
  width: 100px;
  outline: none;

  &:focus {
    border-color: #57606a;
  }
`;

const FolderCount = styled.span`
  margin-left: 8px;
  color: #9ca3af;
  font-size: 12px;
`;

const FolderActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  position: relative;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  transition: all 0.2s ease-in-out;

  &:hover {
    color: #ffffff;
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const ChatsContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 8px 8px 8px;
`;

const ChatItem = styled.div<{ isActive?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  color: #d1d5db;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: rgba(255, 255, 255, 0.07);
  }

  ${({ isActive }) =>
    isActive &&
    `
    background-color: rgba(16, 163, 127, 0.15);
    border-left: 3px solid #10a37f;
    font-weight: 500;
    color: #ffffff;
  `}
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
  bottom: 100%;
  background-color: #2d2d33;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 999;
  width: 140px;
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const DropdownItem = styled.div`
  padding: 10px 16px;
  cursor: pointer;
  color: #d1d5db;
  font-size: 13px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.07);
  }

  &:first-child {
    border-radius: 8px 8px 0 0;
  }

  &:last-child {
    border-radius: 0 0 8px 8px;
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
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onAddChats: (folderId: string) => void;
  onSelectChat: (chatId: string, folderId: string) => void;
  onRemoveChat: (folderId: string, chatId: string) => void;
  onUpdateChatTitle?: (
    folderId: string,
    chatId: string,
    newTitle: string
  ) => void;
  onUpdateFolderName?: (folderId: string, newName: string) => void;
  currentChatId?: string; // Add this prop to track the current chat
}

// Individual Folder Component
export const FolderComponent: React.FC<FolderComponentProps> = ({
  folder,
  isExpanded,
  onToggleExpand,
  onEditFolder,
  onDeleteFolder,
  onAddChats,
  onSelectChat,
  onRemoveChat,
  onUpdateChatTitle,
  onUpdateFolderName,
  currentChatId,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Add click outside handler to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown) {
        // Check if click is outside both the button and dropdown
        const target = event.target as Node;
        const isClickInsideDropdown = dropdownRef.current?.contains(target);
        const isClickInsideButton = buttonRef.current?.contains(target);

        if (!isClickInsideDropdown && !isClickInsideButton) {
          setShowDropdown(false);
        }
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  // Focus input when editing starts
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleToggleExpand = () => {
    if (!isEditing) {
      onToggleExpand();
    }
  };

  const handleToggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleEdit = () => {
    setShowDropdown(false);
    setIsEditing(true);
    setEditName(folder.name);
  };

  const handleSaveEdit = () => {
    if (editName.trim() !== "" && editName.trim() !== folder.name) {
      if (onUpdateFolderName) {
        onUpdateFolderName(folder.id, editName);
      }
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(folder.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleDelete = () => {
    setShowDropdown(false);
    onDeleteFolder(folder.id);
  };

  const handleAddChats = () => {
    setShowDropdown(false);
    onAddChats(folder.id);
  };

  const handleChatClick = (chatId: string) => {
    // Call the parent handler to update the global currentChatId
    onSelectChat(chatId, folder.id);
  };

  const handleRemoveChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();

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
          {isEditing ? (
            <FolderNameInput
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
            />
          ) : (
            <FolderName>{folder.name}</FolderName>
          )}
          <FolderCount>#{folder.conversations.length}</FolderCount>
        </FolderTitle>
        <FolderActions>
          <ActionButton ref={buttonRef} onClick={handleToggleDropdown}>
            ⋯
          </ActionButton>
          {showDropdown && (
            <Dropdown ref={dropdownRef}>
              <DropdownItem onClick={handleEdit}>Edit folder name</DropdownItem>
              <DropdownItem onClick={handleAddChats}>Add chats</DropdownItem>
              <DropdownItem onClick={handleDelete}>Delete folder</DropdownItem>
            </Dropdown>
          )}
        </FolderActions>
      </FolderHeader>

      {isExpanded && (
        <ChatsContainer>
          {folder.conversations.map((chat) => {
            // Ensure currentChatId is a valid string for comparison
            // Only show chat as active if currentChatId is a valid string and matches
            const isActive = currentChatId === chat.id;

            // Temporary debug log
            console.log(
              `Folder ${folder.name}: Chat ${chat.id} isActive = ${isActive}, currentChatId = ${currentChatId}`
            );
            return (
              <ChatItem
                key={chat.id}
                onClick={() => handleChatClick(chat.id)}
                isActive={isActive}
                data-active={isActive}
              >
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
            );
          })}
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
  onEditFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onAddChats: (folderId: string) => void;
  onSelectChat: (chatId: string, folderId: string) => void;
  onRemoveChat: (folderId: string, chatId: string) => void;
  onUpdateChatTitle?: (
    folderId: string,
    chatId: string,
    newTitle: string
  ) => void;
  currentChatId?: string; // Add this prop to track the current chat
}

// Folder List Component
export const FolderListComponent: React.FC<FolderListProps> = ({
  folders,
  onEditFolder,
  onDeleteFolder,
  onAddChats,
  onSelectChat,
  onRemoveChat,
  onUpdateChatTitle,
  currentChatId,
}) => {
  // Use expandedFolders from the store instead of local state
  const { expandedFolders, toggleFolderExpansion, updateFolderName } =
    useSidePanelStore();

  // Debug log to check what currentChatId is received
  // console.log(
  //   `FolderListComponent Debug: received currentChatId = ${currentChatId}`
  // );

  // Use a ref to maintain the last valid currentChatId
  const lastValidChatIdRef = React.useRef<string | undefined>(undefined);

  // Update the ref when we receive a valid currentChatId
  if (typeof currentChatId === "string" && currentChatId.trim() !== "") {
    lastValidChatIdRef.current = currentChatId;
  }

  // Use the last valid chat ID or the current one if it's valid
  const safeCurrentChatId =
    typeof currentChatId === "string" && currentChatId.trim() !== ""
      ? currentChatId
      : lastValidChatIdRef.current;

  // Add useEffect to track currentChatId changes
  // React.useEffect(() => {
  //   console.log(
  //     `FolderListComponent: currentChatId changed to ${currentChatId}`
  //   );
  // }, [currentChatId]);

  return (
    <FolderContainer>
      {folders.map((folder) => (
        <FolderComponent
          key={folder.id}
          folder={folder}
          isExpanded={expandedFolders[folder.id] || false}
          onToggleExpand={() => toggleFolderExpansion(folder.id)}
          onEditFolder={onEditFolder}
          onDeleteFolder={onDeleteFolder}
          onAddChats={onAddChats}
          onSelectChat={onSelectChat}
          onRemoveChat={onRemoveChat}
          onUpdateChatTitle={onUpdateChatTitle}
          onUpdateFolderName={updateFolderName}
          currentChatId={safeCurrentChatId}
        />
      ))}
    </FolderContainer>
  );
};
