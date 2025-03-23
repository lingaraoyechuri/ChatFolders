import React from "react";
import { useSidePanelStore } from "../../store/sidePanelStore";
import { FolderItem } from "./FolderItem";
import { NewFolderModal } from "./NewFolderModal";
import * as S from "../../styles/sidePanel";

export const SidePanel: React.FC = () => {
  const { isOpen, folders, showNewFolderModal, setShowNewFolderModal } =
    useSidePanelStore();

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
          folders.map((folder) => (
            <FolderItem key={folder.id} folder={folder} />
          ))
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
