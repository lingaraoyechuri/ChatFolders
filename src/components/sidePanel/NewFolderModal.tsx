import React from "react";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useSidePanelStore } from "../../store/sidePanelStore";
import { NewFolderForm } from "./NewFolderForm";

interface NewFolderModalProps {
  onClose?: () => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({ onClose }) => {
  const { showNewFolderModal, setShowNewFolderModal } = useSidePanelStore();

  const handleClose = () => {
    setShowNewFolderModal(false);
    onClose?.();
  };

  return (
    <Dialog
      open={showNewFolderModal}
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
        Create New Folder
        <IconButton onClick={handleClose} sx={{ color: "#8a8d91" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <NewFolderForm onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
};
