import styled from "@emotion/styled";

export const SidePanelContainer = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: ${({ isOpen }) => (isOpen ? "0" : "-400px")};
  width: 400px;
  height: 100vh;
  background-color: #1e2330;
  color: #ffffff;
  transition: right 0.3s ease-in-out;
  z-index: 1000;
  display: flex;
  flex-direction: column;
`;

export const Overlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: ${(props) => (props.isOpen ? "block" : "none")};
  pointer-events: ${(props) => (props.isOpen ? "auto" : "none")};
`;

export const Header = styled.div`
  padding: 16px;
  border-bottom: 1px solid #2a2f3a;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const Title = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #8a8d91;

  &:hover {
    color: #ffffff;
  }
`;

export const Content = styled.div`
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const NewFolderButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #3a84ff;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2970e6;
  }
`;

export const FolderList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`;

export const FolderItem = styled.div`
  display: flex;
  flex-direction: column;
  background: #1e2330;
  border-radius: 6px;
  overflow: hidden;
`;

export const FolderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;

  &:hover {
    background: #262d3d;
  }
`;

export const FolderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const FolderIcon = styled.div`
  font-size: 18px;
`;

export const FolderDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

export const FolderName = styled.div`
  font-weight: 500;
  font-size: 14px;
`;

export const FolderCount = styled.div`
  font-size: 12px;
  color: #8a8d91;
  margin-top: 2px;
`;

export const FolderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const AddButton = styled.button`
  background: none;
  border: none;
  color: rgb(40, 128, 16);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  opacity: 0.9;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;

  &:hover {
    opacity: 1;
    color: #66b3ff;
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

export const OptionsButton = styled.button`
  background: none;
  border: none;
  color: #8a8d91;
  font-size: 16px;
  cursor: pointer;
  position: relative;

  &:hover {
    color: #ffffff;
  }
`;

export const OptionsDropdown = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background: #1e2330;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  width: 120px;
  z-index: 100;
  display: ${(props) => (props.isOpen ? "block" : "none")};
  overflow: hidden;
`;

export const OptionItem = styled.div`
  padding: 8px 12px;
  font-size: 13px;
  color: #ffffff;
  cursor: pointer;

  &:hover {
    background: #262d3d;
  }
`;

export const NewFolderForm = styled.div`
  background: #1e2330;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
`;

export const FormRow = styled.div`
  margin-bottom: 12px;
`;

export const FormLabel = styled.label`
  display: block;
  font-size: 13px;
  margin-bottom: 6px;
  color: #8a8d91;
`;

export const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  background: #0f1218;
  border: 1px solid #2a2f3a;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #3a84ff;
  }
`;

export const EmojiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-top: 8px;
`;

export const EmojiButton = styled.button<{ isSelected: boolean }>`
  padding: 8px;
  font-size: 16px;
  background: ${(props) => (props.isSelected ? "#3a84ff" : "#0f1218")};
  border: 1px solid ${(props) => (props.isSelected ? "#3a84ff" : "#2a2f3a")};
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background: ${(props) => (props.isSelected ? "#3a84ff" : "#262d3d")};
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

export const CustomButton = styled.button<{ primary?: boolean }>`
  padding: 6px 12px;
  background: ${(props) => (props.primary ? "#3a84ff" : "transparent")};
  color: ${(props) => (props.primary ? "#ffffff" : "#8a8d91")};
  border: ${(props) => (props.primary ? "none" : "1px solid #2a2f3a")};
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: ${(props) => (props.primary ? "#2970e6" : "#262d3d")};
  }
`;

export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 100001;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: all;
`;

export const ModalContent = styled.div`
  background: #1e2330;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 100002;
  pointer-events: all;
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #2a2f3a;
`;

export const ModalTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  color: #ffffff;
`;

export const ModalBody = styled.div`
  padding: 16px;
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #2a2f3a;
`;

export const FolderContent = styled.div<{ isExpanded: boolean }>`
  display: ${(props) => (props.isExpanded ? "block" : "none")};
  background: #171d29;
  border-top: 1px solid #2a2f3a;
`;

export const ConversationItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #222836;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #1e2330;
  }
`;

export const ConversationTitle = styled.div`
  font-size: 13px;
  color: #d1d5db;
`;

export const RemoveButton = styled.button`
  background: none;
  border: none;
  color: #8a8d91;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    color: #ff4d4f;
  }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8a8d91;
  padding: 32px;
  text-align: center;
`;
