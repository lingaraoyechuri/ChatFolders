export type Platform = "perplexity" | "chatgpt" | "deepseek";

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  platform: Platform;
  url: string;
  timestamp: number;
  folderIds?: string[];
}

export interface FolderConversation extends Conversation {
  folderId: string;
}

export interface Folder {
  id: string;
  name: string;
  emoji: string;
  conversations: Conversation[];
  createdAt: number;
}

export interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  platform: Platform;
}

export interface DropdownProps {
  folder: Folder;
  onEdit: () => void;
  onDelete: () => void;
  onAddChats: () => void;
}
