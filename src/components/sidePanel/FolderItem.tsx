import React, { useRef, useEffect } from "react";
import { Folder, Conversation } from "../../types/sidePanel";
import { useSidePanelStore } from "../../store/sidePanelStore";
import * as S from "../../styles/sidePanel";
import { NewFolderForm } from "./NewFolderForm";

interface FolderItemProps {
  folder: Folder;
}

export const FolderItem: React.FC<FolderItemProps> = ({ folder }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    editingFolderId,
    expandedFolders,
    activeDropdown,
    handleFolderOptions,
    handleEditFolder,
    handleDeleteFolder,
    toggleFolderExpansion,
    openAddChatsModal,
    removeChatFromFolder,
    getFolderConversations,
  } = useSidePanelStore();

  const isEditing = editingFolderId === folder.id;
  const isExpanded = expandedFolders[folder.id];
  const conversations = getFolderConversations(folder.id);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        handleFolderOptions(folder.id, event as unknown as React.MouseEvent);
      }
    };

    if (activeDropdown === folder.id) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeDropdown, folder.id, handleFolderOptions]);

  if (isEditing) {
    return <NewFolderForm isEditing />;
  }

  return (
    <div className="folder-item mb-2">
      <div
        className="folder-header flex items-center justify-between w-full px-3 py-2 text-sm bg-gray-900 hover:bg-gray-800 rounded-md cursor-pointer transition-colors group"
        onClick={() => toggleFolderExpansion(folder.id)}
      >
        <div className="flex items-center gap-3 flex-1">
          <span className="text-lg">{folder.emoji}</span>
          <div className="flex flex-col">
            <span className="font-medium text-white">{folder.name}</span>
            <span className="text-xs text-gray-300">
              {folder.conversations.length} saved chats
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="add-chat-btn p-1.5 bg-gray-800 hover:bg-gray-700 rounded transition-all"
            onClick={(e) => {
              e.stopPropagation();
              openAddChatsModal(folder.id, e);
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-300"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <div ref={dropdownRef}>
            <button
              className="options-btn p-1.5 bg-gray-800 hover:bg-gray-700 rounded transition-all"
              onClick={(e) => {
                e.stopPropagation();
                handleFolderOptions(folder.id, e);
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-300"
              >
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="19" cy="12" r="1"></circle>
                <circle cx="5" cy="12" r="1"></circle>
              </svg>
              <S.OptionsDropdown isOpen={activeDropdown === folder.id}>
                <S.OptionItem onClick={() => handleEditFolder(folder)}>
                  Rename
                </S.OptionItem>
                <S.OptionItem onClick={() => handleDeleteFolder(folder.id)}>
                  Delete
                </S.OptionItem>
              </S.OptionsDropdown>
            </button>
          </div>
        </div>
      </div>
      <div
        className="chat-list pl-6 mt-1 space-y-1"
        style={{ display: isExpanded ? "block" : "none" }}
      >
        {conversations.length > 0 ? (
          conversations.map((conv: Conversation) => (
            <div
              key={conv.id}
              className="chat-item flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-md group"
            >
              <a
                href={conv.url}
                className="flex-1 truncate hover:text-white transition-colors"
              >
                {conv.title}
              </a>
              <button
                className="remove-btn p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-700 rounded transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  removeChatFromFolder(folder.id, conv.id, e);
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-gray-300 hover:text-white"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          ))
        ) : (
          <div className="chat-item flex items-center px-3 py-2 text-sm text-gray-400">
            No chats in this folder
          </div>
        )}
      </div>
    </div>
  );
};
