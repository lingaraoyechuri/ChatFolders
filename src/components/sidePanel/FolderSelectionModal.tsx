import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  IconButton,
  Button as MuiButton,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useSidePanelStore } from "../../store/sidePanelStore";
import { Conversation, Folder } from "../../types/sidePanel";

interface FolderSelectionModalProps {
  chat?: Conversation;
  onClose?: () => void;
}

export const FolderSelectionModal: React.FC<FolderSelectionModalProps> = ({
  chat,
  onClose,
}) => {
  const {
    showFolderSelectionModal,
    folders,
    selectedChatForFolders,
    setShowFolderSelectionModal,
    setSelectedChatForFolders,
    handleAddChatToFolders,
  } = useSidePanelStore();

  const handleClose = () => {
    setShowFolderSelectionModal(false);
    setSelectedChatForFolders(null);
    onClose?.();
  };

  const handleFolderToggle = (folderId: string) => {
    if (selectedChatForFolders) {
      const newFolderIds = selectedChatForFolders.folderIds || [];
      const updatedFolderIds = newFolderIds.includes(folderId)
        ? newFolderIds.filter((id) => id !== folderId)
        : [...newFolderIds, folderId];
      setSelectedChatForFolders({
        ...selectedChatForFolders,
        folderIds: updatedFolderIds,
      });
    }
  };

  return (
    <Dialog
      open={showFolderSelectionModal}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "#1e2330",
          color: "#ffffff",
          "& .MuiDialogTitle-root": {
            borderBottom: "1px solid #2a2f3a",
          },
          "& .MuiDialogContent-root": {
            padding: "16px",
          },
          "& .MuiDialogActions-root": {
            borderTop: "1px solid #2a2f3a",
            padding: "16px",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#ffffff",
        }}
      >
        Add "{chat?.title}" to Folders
        <IconButton onClick={handleClose} sx={{ color: "#8a8d91" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <List>
          {folders.map((folder: Folder) => (
            <ListItem
              key={folder.id}
              component="div"
              onClick={() => handleFolderToggle(folder.id)}
              sx={{
                cursor: "pointer",
                "&:hover": {
                  bgcolor: "#262d3d",
                },
              }}
            >
              <Checkbox
                checked={selectedChatForFolders?.folderIds?.includes(folder.id)}
                onChange={(e) => {
                  e.stopPropagation(); // Prevent double triggering with ListItem click
                  handleFolderToggle(folder.id);
                }}
                sx={{
                  color: "#8a8d91",
                  "&.Mui-checked": {
                    color: "#3a84ff",
                  },
                }}
              />
              <ListItemText
                primary={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>{folder.emoji}</span>
                    <span>{folder.name}</span>
                  </div>
                }
                secondary={`${folder.conversations.length} chats`}
                sx={{
                  "& .MuiListItemText-primary": {
                    color: "#ffffff",
                  },
                  "& .MuiListItemText-secondary": {
                    color: "#8a8d91",
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <MuiButton onClick={handleClose} sx={{ color: "#8a8d91" }}>
          Cancel
        </MuiButton>
        <MuiButton
          variant="contained"
          onClick={() => {
            handleAddChatToFolders();
            handleClose();
          }}
          disabled={!selectedChatForFolders?.folderIds?.length}
          sx={{
            bgcolor: "#3a84ff",
            "&:hover": {
              bgcolor: "#2970e6",
            },
            "&.Mui-disabled": {
              bgcolor: "#2a2f3a",
            },
          }}
        >
          Add to Selected Folders
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
};
