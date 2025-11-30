import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { ShotType } from '../types';
import { useFileList } from './FileListContext';
import { useIngestSettings } from './IngestSettingsContext';

export interface MetadataFormContextValue {
  // Form state
  location: string;
  subject: string;
  action: string;
  shotType: ShotType | '';
  shotName: string;
  keywords: string;
  isLoading: boolean;
  shotTypes: string[];

  // Form setters
  setLocation: (value: string) => void;
  setSubject: (value: string) => void;
  setAction: (value: string) => void;
  setShotType: (value: ShotType | '') => void;
  setKeywords: (value: string) => void;

  // Handlers
  handleSave: () => Promise<void>;
  handleAIAssist: () => Promise<void>;
}

const MetadataFormContext = createContext<MetadataFormContextValue | undefined>(undefined);

export function MetadataFormProvider({ children }: { children: ReactNode }) {
  // Dependencies from other contexts
  const { files, currentFileIndex, setFiles } = useFileList();
  // Note: lexiconConfig available for future use (e.g., dropdown autocomplete)
  const { lexiconConfig: _lexiconConfig } = useIngestSettings();

  // Memoize currentFile to stabilize dependencies for useEffect hooks
  const currentFile = useMemo(() => files[currentFileIndex], [files, currentFileIndex]);

  // Form state
  const [location, setLocation] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [shotType, setShotType] = useState<ShotType | ''>('');
  const [shotName, setShotName] = useState<string>('');
  const [keywords, setKeywords] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [shotTypes, setShotTypes] = useState<string[]>([]);

  // Load shot types on mount
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getShotTypes()
        .then(setShotTypes)
        .catch(error => {
          console.error('Failed to load shot types:', error);
          // Fallback to default shot types
          setShotTypes(['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB']);
        });
    }
  }, []);

  // Sync form fields with currentFile
  useEffect(() => {
    if (!currentFile) {
      setLocation('');
      setSubject('');
      setAction('');
      setShotType('');
      setShotName('');
      setKeywords('');
      return;
    }

    // Parse structured naming if available
    if (currentFile.location && currentFile.subject && currentFile.shotType) {
      setLocation(currentFile.location);
      setSubject(currentFile.subject);
      setAction(currentFile.action || '');
      setShotType(currentFile.shotType as ShotType);
      setShotName(currentFile.shotName);
    } else if (currentFile.shotName) {
      // Try parsing shotName pattern: {location}-{subject}-{shotType} or {location}-{subject}-{action}-{shotType}
      const parts = currentFile.shotName.split('-');
      if (parts.length === 4 && shotTypes.includes(parts[3].toUpperCase())) {
        // 4-part video format
        setLocation(parts[0]);
        setSubject(parts[1]);
        setAction(parts[2]);
        setShotType(parts[3].toUpperCase() as ShotType);
        setShotName(currentFile.shotName);
      } else if (parts.length === 3 && shotTypes.includes(parts[2].toUpperCase())) {
        // 3-part photo format
        setLocation(parts[0]);
        setSubject(parts[1]);
        setAction('');
        setShotType(parts[2].toUpperCase() as ShotType);
        setShotName(currentFile.shotName);
      } else {
        // Legacy format - populate shotName directly
        setLocation('');
        setSubject('');
        setAction('');
        setShotType('');
        setShotName(currentFile.shotName);
      }
    } else {
      setLocation('');
      setSubject('');
      setAction('');
      setShotType('');
      setShotName('');
    }

    setKeywords(currentFile.keywords?.join(', ') || '');
  }, [currentFile, shotTypes]);

  const handleSave = useCallback(async () => {
    if (!currentFile) return;

    setIsLoading(true);
    const currentFileId = currentFile.id;

    try {
      // Build title from structured components
      let generatedTitle = '';
      if (location && subject && shotType) {
        // Structured naming: 4-part for videos (with action), 3-part for photos (without action)
        if (currentFile.fileType === 'video' && action) {
          generatedTitle = `${location}-${subject}-${action}-${shotType}`;
        } else {
          generatedTitle = `${location}-${subject}-${shotType}`;
        }
        setShotName(generatedTitle);
      }

      // Build metadata tags array
      const metadataTags = keywords
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Save title and metadata with structured components
      const structuredData = location && subject && shotType ? { location, subject, action, shotType } : undefined;

      // Save everything via updateStructuredMetadata
      if (structuredData) {
        await window.electronAPI.updateStructuredMetadata(
          currentFile.id,
          structuredData,
          currentFile.filePath,
          currentFile.fileType as 'image' | 'video'
        );
        // Update metadata tags
        await window.electronAPI.updateMetadata(currentFile.id, metadataTags);
      } else {
        // Legacy path: Just update metadata if no structured data
        await window.electronAPI.updateMetadata(currentFile.id, metadataTags);
      }

      // Update files in context
      const updatedFiles = files.map(f => {
        if (f.id === currentFileId) {
          return {
            ...f,
            keywords: metadataTags,
            location,
            subject,
            action: action || '',
            shotType: shotType as ShotType || '',
          };
        }
        return f;
      });
      setFiles(updatedFiles);
    } finally {
      setIsLoading(false);
    }
  }, [currentFile, location, subject, action, shotType, keywords, files, setFiles]);

  const handleAIAssist = useCallback(async () => {
    if (!currentFile) return;

    setIsLoading(true);
    try {
      const result = await window.electronAPI.analyzeFile(currentFile.filePath);

      // Populate structured fields if available
      if (result.location && result.subject && result.shotType) {
        setLocation(result.location);
        setSubject(result.subject);
        setAction(result.action || '');
        setShotType(result.shotType);
        setShotName(result.shotName);
      } else {
        // Legacy format - populate shotName directly
        setShotName(result.shotName);
      }

      setKeywords(result.keywords?.join(', ') || '');
    } finally {
      setIsLoading(false);
    }
  }, [currentFile]);

  const value: MetadataFormContextValue = {
    location,
    subject,
    action,
    shotType,
    shotName,
    keywords,
    isLoading,
    shotTypes,
    setLocation,
    setSubject,
    setAction,
    setShotType,
    setKeywords,
    handleSave,
    handleAIAssist,
  };

  return (
    <MetadataFormContext.Provider value={value}>
      {children}
    </MetadataFormContext.Provider>
  );
}

export function useMetadataForm() {
  const context = useContext(MetadataFormContext);
  if (context === undefined) {
    throw new Error('useMetadataForm must be used within MetadataFormProvider');
  }
  return context;
}
