import { createContext, useContext, useState } from 'react';
import type { FileMetadata } from '../types';

interface FileListContextValue {
  folderPath: string;
  files: FileMetadata[];
  currentFileIndex: number;
  selectedFileIds: Set<string>;
  isFolderCompleted: boolean;
  isFolderLoading: boolean;
  handleSelectFolder: () => Promise<void>;
  handleToggleSelection: (fileId: string, selected: boolean) => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handleCompleteFolder: () => Promise<void>;
  handleReopenFolder: () => Promise<void>;
  setFiles: (files: FileMetadata[]) => void;
  setCurrentFileIndex: (index: number) => void;
}

const FileListContext = createContext<FileListContextValue | undefined>(undefined);

export function FileListProvider({ children }: { children: React.ReactNode }) {
  const [folderPath, setFolderPath] = useState<string>('');
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isFolderCompleted, setIsFolderCompleted] = useState<boolean>(false);
  const [isFolderLoading, setIsFolderLoading] = useState<boolean>(false);

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectFolder();
      if (path) {
        setIsFolderLoading(true);
        try {
          setFolderPath(path);
          const loadedFiles = await window.electronAPI.loadFiles();
          setFiles(loadedFiles);
          setCurrentFileIndex(0);
          // Clear selection when switching folders
          setSelectedFileIds(new Set());

          // Load folder completion status
          try {
            const completed = await window.electronAPI.getFolderCompleted();
            setIsFolderCompleted(completed);
          } catch (error) {
            console.error('Failed to load folder completion status:', error);
            // Default to false (editable) if there's an error
            setIsFolderCompleted(false);
          }
        } finally {
          setIsFolderLoading(false);
        }
      }
    }
  };

  const handleToggleSelection = (fileId: string, selected: boolean) => {
    setSelectedFileIds(prev => {
      const newSelection = new Set(prev);
      if (selected) {
        newSelection.add(fileId);
      } else {
        newSelection.delete(fileId);
      }
      return newSelection;
    });
  };

  const handleNext = () => {
    if (currentFileIndex < files.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
    }
  };

  const handleCompleteFolder = async () => {
    if (!folderPath) return;

    try {
      await window.electronAPI.setFolderCompleted(true);
      setIsFolderCompleted(true);
    } catch (error) {
      console.error('Failed to complete folder:', error);
      // Don't update state on error - leave as-is
    }
  };

  const handleReopenFolder = async () => {
    if (!folderPath) return;

    try {
      await window.electronAPI.setFolderCompleted(false);
      setIsFolderCompleted(false);
    } catch (error) {
      console.error('Failed to reopen folder:', error);
      // Don't update state on error - leave as-is
    }
  };

  const value: FileListContextValue = {
    folderPath,
    files,
    currentFileIndex,
    selectedFileIds,
    isFolderCompleted,
    isFolderLoading,
    handleSelectFolder,
    handleToggleSelection,
    handleNext,
    handlePrevious,
    handleCompleteFolder,
    handleReopenFolder,
    setFiles,
    setCurrentFileIndex,
  };

  return (
    <FileListContext.Provider value={value}>
      {children}
    </FileListContext.Provider>
  );
}

export function useFileList() {
  const context = useContext(FileListContext);
  if (context === undefined) {
    throw new Error('useFileList must be used within a FileListProvider');
  }
  return context;
}
