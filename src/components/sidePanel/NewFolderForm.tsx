import React, { useEffect } from "react";
import { EMOJI_OPTIONS } from "../../constants/emojis";
import { useSidePanelStore } from "../../store/sidePanelStore";
import * as S from "../../styles/sidePanel";

interface NewFolderFormProps {
  isEditing?: boolean;
  onClose?: () => void;
}

export const NewFolderForm: React.FC<NewFolderFormProps> = ({
  isEditing = false,
  onClose,
}) => {
  const {
    newFolderName,
    selectedEmoji,
    editingFolderName,
    editingFolderEmoji,
    editingFolder,
    setNewFolderName,
    setSelectedEmoji,
    setEditingFolderName,
    setEditingFolderEmoji,
    handleSubmitNewFolder,
    handleCancelNewFolder,
    handleSaveEdit,
    handleCancelEdit,
  } = useSidePanelStore();

  // Set initial values when editing
  useEffect(() => {
    if (isEditing && editingFolder) {
      setEditingFolderName(editingFolder.name);
      setEditingFolderEmoji(editingFolder.emoji);
    }
  }, [isEditing, editingFolder, setEditingFolderName, setEditingFolderEmoji]);

  const name = isEditing ? editingFolderName : newFolderName;
  const emoji = isEditing ? editingFolderEmoji : selectedEmoji;
  const setName = isEditing ? setEditingFolderName : setNewFolderName;
  const setEmoji = isEditing ? setEditingFolderEmoji : setSelectedEmoji;

  const handleSubmit = () => {
    if (isEditing) {
      handleSaveEdit();
    } else {
      handleSubmitNewFolder();
    }
    onClose?.();
  };

  const handleCancel = () => {
    if (isEditing) {
      handleCancelEdit();
    } else {
      handleCancelNewFolder();
    }
    onClose?.();
  };

  return (
    <S.NewFolderForm>
      <S.FormRow>
        <S.FormLabel>Folder Name</S.FormLabel>
        <S.Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter folder name"
          autoFocus
        />
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel>Select Icon</S.FormLabel>
        <S.EmojiGrid>
          {EMOJI_OPTIONS.map((emojiOption) => (
            <S.EmojiButton
              key={emojiOption}
              isSelected={emoji === emojiOption}
              onClick={() => setEmoji(emojiOption)}
            >
              {emojiOption}
            </S.EmojiButton>
          ))}
        </S.EmojiGrid>
      </S.FormRow>

      <S.ButtonGroup>
        <S.CustomButton onClick={handleCancel}>Cancel</S.CustomButton>
        <S.CustomButton primary onClick={handleSubmit}>
          {isEditing ? "Save" : "Create"}
        </S.CustomButton>
      </S.ButtonGroup>
    </S.NewFolderForm>
  );
};
