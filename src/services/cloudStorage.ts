import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  enableNetwork,
  disableNetwork,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Folder, Conversation } from "../types/sidePanel";

export class CloudStorageService {
  private static instance: CloudStorageService;
  private unsubscribeFunctions: (() => void)[] = [];

  static getInstance(): CloudStorageService {
    if (!CloudStorageService.instance) {
      CloudStorageService.instance = new CloudStorageService();
    }
    return CloudStorageService.instance;
  }

  // Enable/disable network for offline support
  async enableNetwork(): Promise<void> {
    await enableNetwork(db);
  }

  async disableNetwork(): Promise<void> {
    await disableNetwork(db);
  }

  // Get user's folders from Firestore
  async getUserFolders(userId: string): Promise<Folder[]> {
    try {
      const foldersRef = collection(db, "users", userId, "folders");
      const querySnapshot = await getDocs(foldersRef);

      const folders: Folder[] = [];
      querySnapshot.forEach((doc) => {
        folders.push({ id: doc.id, ...doc.data() } as Folder);
      });

      return folders;
    } catch (error) {
      console.error("Error fetching user folders:", error);
      throw error;
    }
  }

  // Save a single folder to Firestore
  async saveFolder(userId: string, folder: Folder): Promise<void> {
    try {
      const folderRef = doc(db, "users", userId, "folders", folder.id);
      await setDoc(folderRef, {
        name: folder.name,
        emoji: folder.emoji,
        conversations: folder.conversations,
        createdAt: folder.createdAt,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Error saving folder:", error);
      throw error;
    }
  }

  // Save multiple folders in a batch
  async saveFolders(userId: string, folders: Folder[]): Promise<void> {
    try {
      const batch = writeBatch(db);

      folders.forEach((folder) => {
        const folderRef = doc(db, "users", userId, "folders", folder.id);
        batch.set(folderRef, {
          name: folder.name,
          emoji: folder.emoji,
          conversations: folder.conversations,
          createdAt: folder.createdAt,
          updatedAt: Date.now(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error("Error saving folders batch:", error);
      throw error;
    }
  }

  // Update a folder
  async updateFolder(userId: string, folder: Folder): Promise<void> {
    try {
      const folderRef = doc(db, "users", userId, "folders", folder.id);
      await updateDoc(folderRef, {
        name: folder.name,
        emoji: folder.emoji,
        conversations: folder.conversations,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Error updating folder:", error);
      throw error;
    }
  }

  // Delete a folder
  async deleteFolder(userId: string, folderId: string): Promise<void> {
    try {
      const folderRef = doc(db, "users", userId, "folders", folderId);
      await deleteDoc(folderRef);
    } catch (error) {
      console.error("Error deleting folder:", error);
      throw error;
    }
  }

  // Set up real-time listener for user's folders
  setupFoldersListener(
    userId: string,
    callback: (folders: Folder[]) => void
  ): () => void {
    try {
      const foldersRef = collection(db, "users", userId, "folders");

      const unsubscribe = onSnapshot(
        foldersRef,
        (querySnapshot) => {
          const folders: Folder[] = [];
          querySnapshot.forEach((doc) => {
            folders.push({ id: doc.id, ...doc.data() } as Folder);
          });
          callback(folders);
        },
        (error) => {
          console.error("Error in folders listener:", error);
        }
      );

      this.unsubscribeFunctions.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up folders listener:", error);
      throw error;
    }
  }

  // Set up real-time listener for a specific folder
  setupFolderListener(
    userId: string,
    folderId: string,
    callback: (folder: Folder | null) => void
  ): () => void {
    try {
      const folderRef = doc(db, "users", userId, "folders", folderId);

      const unsubscribe = onSnapshot(
        folderRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const folder = {
              id: docSnapshot.id,
              ...docSnapshot.data(),
            } as Folder;
            callback(folder);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error("Error in folder listener:", error);
        }
      );

      this.unsubscribeFunctions.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up folder listener:", error);
      throw error;
    }
  }

  // Migrate local data to cloud
  async migrateToCloud(userId: string, localFolders: Folder[]): Promise<void> {
    try {
      console.log(
        `Migrating ${localFolders.length} folders to cloud for user ${userId}`
      );
      await this.saveFolders(userId, localFolders);
      console.log("Migration completed successfully");
    } catch (error) {
      console.error("Error during migration:", error);
      throw error;
    }
  }

  // Sync local changes to cloud
  async syncToCloud(userId: string, folders: Folder[]): Promise<void> {
    try {
      await this.saveFolders(userId, folders);
    } catch (error) {
      console.error("Error syncing to cloud:", error);
      throw error;
    }
  }

  // Get sync status
  async getSyncStatus(
    userId: string
  ): Promise<{ lastSync: Date | null; isOnline: boolean }> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          lastSync: data.lastSync?.toDate() || null,
          isOnline: true,
        };
      }

      return { lastSync: null, isOnline: true };
    } catch (error) {
      console.error("Error getting sync status:", error);
      return { lastSync: null, isOnline: false };
    }
  }

  // Update last sync timestamp
  async updateLastSync(userId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, { lastSync: new Date() }, { merge: true });
    } catch (error) {
      console.error("Error updating last sync:", error);
    }
  }

  // Cleanup all listeners
  cleanup(): void {
    this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeFunctions = [];
  }
}

export const cloudStorage = CloudStorageService.getInstance();
