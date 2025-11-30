import { createContext, useContext } from 'react';
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
  // Stub implementation - tests will fail
  return (
    <FileListContext.Provider value={undefined as any}>
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
