import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  IconButton,
  InputAdornment,
  Button as MuiButton,
} from "@mui/material";
import { Search as SearchIcon, Close as CloseIcon } from "@mui/icons-material";
import { useSidePanelStore } from "../../store/sidePanelStore";
import { Folder, Conversation } from "../../types/sidePanel";

interface AddChatsModalProps {
  folder: Folder;
  onClose?: () => void;
}

export const AddChatsModal: React.FC<AddChatsModalProps> = ({
  folder,
  onClose,
}) => {
  const {
    showAddChatsModal,
    selectedChats,
    searchQuery,
    closeAddChatsModal,
    toggleChatSelection,
    addChatsToFolder,
    setSearchQuery,
    getAvailableChats,
  } = useSidePanelStore();

  const handleClose = () => {
    closeAddChatsModal();
    onClose?.();
  };

  const availableChats = getAvailableChats();
  const filteredChats = availableChats.filter((chat: Conversation) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog
      open={showAddChatsModal}
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
        Add Chats to {folder.name}
        <IconButton onClick={handleClose} sx={{ color: "#8a8d91" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              bgcolor: "#0f1218",
              color: "#ffffff",
              "& fieldset": {
                borderColor: "#2a2f3a",
              },
              "&:hover fieldset": {
                borderColor: "#3a84ff",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#3a84ff",
              },
            },
            "& .MuiInputLabel-root": {
              color: "#8a8d91",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#8a8d91" }} />
              </InputAdornment>
            ),
          }}
        />
        {filteredChats.length > 0 ? (
          <List
            sx={{
              maxHeight: 300,
              overflow: "auto",
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                background: "#0f1218",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "#2a2f3a",
                borderRadius: "4px",
              },
            }}
          >
            {filteredChats.map((chat: Conversation) => (
              <ListItem
                key={chat.id}
                component="div"
                onClick={() => toggleChatSelection(chat.id)}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "#262d3d",
                  },
                }}
              >
                <Checkbox
                  checked={selectedChats.includes(chat.id)}
                  onChange={() => toggleChatSelection(chat.id)}
                  sx={{
                    color: "#8a8d91",
                    "&.Mui-checked": {
                      color: "#3a84ff",
                    },
                  }}
                />
                <ListItemText
                  primary={chat.title}
                  secondary={
                    chat.folderIds && chat.folderIds.length > 0 ? (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {chat.folderIds.map((folderId) => {
                          const folderInfo = useSidePanelStore
                            .getState()
                            .folders.find((f) => f.id === folderId);
                          if (!folderInfo) return null;
                          return (
                            <span
                              key={folderId}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-200"
                            >
                              {folderInfo.emoji} {folderInfo.name}
                            </span>
                          );
                        })}
                      </div>
                    ) : null
                  }
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
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#8a8d91",
            }}
          >
            No available chats to add
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <MuiButton onClick={handleClose} sx={{ color: "#8a8d91" }}>
          Cancel
        </MuiButton>
        <MuiButton
          variant="contained"
          onClick={addChatsToFolder}
          disabled={selectedChats.length === 0}
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
          Add Selected
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
};
