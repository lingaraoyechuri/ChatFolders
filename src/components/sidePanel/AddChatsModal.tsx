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

  // Refresh available chats when modal opens
  React.useEffect(() => {
    if (showAddChatsModal) {
      console.log("AddChatsModal: Modal opened, refreshing available chats...");
      // Add a small delay to ensure all chats are loaded
      const timer = setTimeout(() => {
        const chats = getAvailableChats();
        console.log("AddChatsModal: Available chats count:", chats.length);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [showAddChatsModal, getAvailableChats]);

  const handleRefresh = () => {
    console.log("AddChatsModal: Manual refresh triggered");
    // Force a re-render by calling getAvailableChats
    const chats = getAvailableChats();
    console.log("AddChatsModal: Refreshed chats count:", chats.length);
  };

  const handleClose = () => {
    closeAddChatsModal();
    onClose?.();
  };

  const availableChats = getAvailableChats();
  const filteredChats = availableChats.filter((chat: Conversation) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  console.log(
    "AddChatsModal: Rendering with",
    availableChats.length,
    "available chats,",
    filteredChats.length,
    "filtered chats"
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
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleRefresh}
                  sx={{ color: "#8a8d91" }}
                  title="Refresh available chats"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10 3a7 7 0 0 0-7 7H1l3.5 3.5L8 10H6a4 4 0 1 1 4 4v2a6 6 0 1 0-6-6H2a8 8 0 1 1 8 8v-2a6 6 0 0 0 0-12z" />
                  </svg>
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Debug info */}
        <div
          style={{
            fontSize: "12px",
            color: "#8a8d91",
            marginBottom: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Available chats: {availableChats.length}</span>
          <span>Filtered chats: {filteredChats.length}</span>
          {searchQuery && <span>Search: "{searchQuery}"</span>}
        </div>

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
