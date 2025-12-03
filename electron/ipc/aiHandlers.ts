/**
 * AI IPC Handlers
 *
 * Exposes AI operations to renderer process via IPC bridge.
 *
 * Design Philosophy (MIP Compliance):
 * - ESSENTIAL: IPC handlers expose AI analysis operations to UI
 * - ESSENTIAL: Security validation for all file operations before AI processing
 * - ESSENTIAL: Hot-reload capability for AI config changes (setAiService)
 * - DEFERRED: N/A (core feature set complete)
 *
 * Architecture Pattern:
 * - Dependency injection for services (aiService, securityValidator, etc.)
 * - Module-level state for aiService (mutable via setAiService for hot-reload)
 * - Returns setAiService function for config updates to reload service
 * - Follows existing v2.2.0 IPC pattern
 *
 * System Ripples:
 * - Enables AI analysis UI to invoke single-file and batch processing
 * - Security validation prevents malicious files from reaching AI API
 * - Rate limiting prevents abuse during batch processing
 * - Hot-reload enables config changes without app restart
 * - Config handlers enable AI setup and testing from UI
 *
 * Reference: Issue #137 - Extract IPC handlers from main.ts
 */

import { ipcMain, BrowserWindow } from 'electron';
import { z } from 'zod';
import type { AIService } from '../services/aiService';
import type { SecurityValidator } from '../services/securityValidator';
import { SecurityViolationError } from '../utils/securityViolationError';
import type { FileManager } from '../services/fileManager';
import type { ConfigManager } from '../services/configManager';
import type { RateLimiter } from '../utils/rateLimiter';
import { MetadataStore } from '../services/metadataStore';
import { MetadataWriter } from '../services/metadataWriter';
import { sanitizeError } from '../utils/errorSanitization';
import { AIBatchProcessSchema } from '../schemas/ipcSchemas';
import type { AIAnalysisResult, FileMetadata } from '../../src/types';
import { isAIFailure } from '../utils/aiResultValidation';
import { generateTitleWithTimestamp } from '../utils/timestampUtils';

/**
 * Dependencies required by AI handlers
 */
export interface AiHandlerDependencies {
  aiService: AIService | null;
  securityValidator: SecurityValidator;
  fileManager: FileManager;
  configManager: ConfigManager;
  batchProcessRateLimiter: RateLimiter;
  getCurrentFolderPath: () => string | null;
  getMetadataStoreForFolder: (path: string) => MetadataStore;
  normalizeFilePath: (metadata: FileMetadata, basePath: string) => string;
}

// Module-level state
let aiService: AIService | null = null;

/**
 * Register AI IPC handlers
 * Called from main.ts after app.whenReady()
 *
 * @returns Object with setAiService function for hot-reload capability
 */
export function registerAiHandlers(
  mainWindow: BrowserWindow,
  deps: AiHandlerDependencies
): { setAiService: (service: AIService | null) => void } {
  const {
    securityValidator,
    fileManager,
    configManager,
    batchProcessRateLimiter,
    getCurrentFolderPath,
    getMetadataStoreForFolder,
    normalizeFilePath
  } = deps;

  // Initialize module-level state
  aiService = deps.aiService;

  // MetadataWriter instance for timestamp extraction
  const metadataWriter = new MetadataWriter();

  // ============================================================================
  // ai:analyze-file - Single file AI analysis with security validation
  // ============================================================================
  ipcMain.handle('ai:analyze-file', async (_event, filePath: string) => {
    try {
      if (!aiService) {
        throw new Error('AI service not configured. Please set API key in config.');
      }

      // Security: Validate path before AI processing
      const validPath = await securityValidator.validateFilePath(filePath);

      // Security: Validate file content (prevents sending malware to AI API)
      await securityValidator.validateFileContent(validPath);

      const lexicon = await configManager.getLexicon();

      // Detect file type and route to appropriate analysis method
      const fileType = fileManager.getFileType(validPath);

      if (fileType === 'video') {
        // For videos, we extract frames (not load entire file), so no size limit needed
        // Video files can be 5GB+ which is fine since we only extract ~5 JPEG frames
        console.log('[IPC] Analyzing video file (frame extraction):', validPath);
        return await aiService.analyzeVideo(validPath, lexicon);
      } else {
        // For images, validate size before loading into memory for AI analysis
        // Security: Validate file size (prevents DoS)
        await securityValidator.validateFileSize(validPath, 100 * 1024 * 1024); // 100MB

        console.log('[IPC] Analyzing image file:', validPath);
        return await aiService.analyzeImage(validPath, lexicon);
      }
    } catch (error) {
      console.error('Failed to analyze file:', error);

      // Special handling for security violations
      if (error instanceof SecurityViolationError) {
        console.error('Security violation:', error.type, error.details);
        throw new Error('File validation failed');
      }

      throw sanitizeError(error);
    }
  });

  // ============================================================================
  // ai:batch-process - Multi-file AI batch processing with rate limiting
  // ============================================================================
  ipcMain.handle('ai:batch-process', async (_event, fileIds: string[]) => {
    try {
      // Security: Validate input schema
      const validated = AIBatchProcessSchema.parse({ fileIds });

      if (!aiService) {
        throw new Error('AI service not configured.');
      }

      const currentFolderPath = getCurrentFolderPath();
      if (!currentFolderPath) {
        throw new Error('No folder selected');
      }

      const store = getMetadataStoreForFolder(currentFolderPath);
      const results = new Map();
      const lexicon = await configManager.getLexicon();

      for (const fileId of validated.fileIds) {
      // Security: Rate limiting per file (prevents abuse)
      await batchProcessRateLimiter.consume(1);

      const fileMetadata = await store.getFileMetadata(fileId);
      if (!fileMetadata || fileMetadata.processedByAI) continue;

      try {
        // CRITICAL-8: Security validation for each file in batch
        // Mitigates: Path traversal, content type confusion, resource exhaustion
        // Pattern: Same 3-layer validation as ai:analyze-file handler
        // Cross-platform fix: Normalize path to handle macOS/Linux mount point differences
        const normalizedPath = normalizeFilePath(fileMetadata, currentFolderPath);
        const validatedPath = await securityValidator.validateFilePath(normalizedPath);
        await securityValidator.validateFileContent(validatedPath);

        // Detect file type and route to appropriate analysis method
        const fileType = fileManager.getFileType(validatedPath);

        let result: AIAnalysisResult;
        if (fileType === 'video') {
          // For videos, we extract frames (not load entire file), so no size limit needed
          console.log('[IPC] Batch analyzing video file (frame extraction):', validatedPath);
          result = await aiService.analyzeVideo(validatedPath, lexicon);
        } else {
          // For images, validate size before loading into memory for AI analysis
          // Security: Validate file size (prevents DoS)
          await securityValidator.validateFileSize(validatedPath, 100 * 1024 * 1024); // 100MB

          console.log('[IPC] Batch analyzing image file:', validatedPath);
          result = await aiService.analyzeImage(validatedPath, lexicon);
        }
        results.set(fileId, result);

        // Issue #128: Validate AI result before marking as processed
        // Detect TRUE FAILURE (confidence=0 + all empty) vs valid low-confidence results (PR #131)
        if (isAIFailure(result)) {
          console.error(`[batch] AI analysis failed for ${fileId}: confidence=0, no structured data`);
          // Don't mark as processed - allows user to see and retry failed files
          continue; // Skip to next file without updating metadata
        }

        // Write ALL AI results regardless of confidence for QC analysis workflow
        // Rationale: User workflow requires all results (high + low confidence) written to .ingest-metadata.json
        // QC person reviews/corrects → separate JSON with corrections → analyze AI accuracy
        // Confidence value is preserved in results map for downstream analysis
        // Append timestamp ONLY if shotNumber is not present (same logic as file:update-structured-metadata)
        // When shotNumber exists, it provides uniqueness (e.g., kitchen-fridge-MID-#1)
        // When shotNumber absent, timestamp provides uniqueness (e.g., kitchen-oven-WS-20251103100530)
        // R1.1 Schema: shotName with #N suffix
        fileMetadata.shotName = fileMetadata.shotNumber !== undefined
          ? `${result.shotName}-#${fileMetadata.shotNumber}` // Add #N suffix when shot number present
          : await generateTitleWithTimestamp(
              result.shotName,
              fileMetadata,
              (filePath): Promise<Date | undefined> => metadataWriter.readCreationTimestamp(filePath)
            ); // Timestamp for legacy folders
        fileMetadata.keywords = result.keywords;
        fileMetadata.location = result.location;
        fileMetadata.subject = result.subject;
        fileMetadata.action = result.action;
        fileMetadata.shotType = result.shotType;
        fileMetadata.processedByAI = true;
        MetadataStore.updateAuditTrail(fileMetadata);
        await store.updateFileMetadata(fileId, fileMetadata);
      } catch (error) {
        // Security validation errors are logged with their type for audit trail
        if (error instanceof SecurityViolationError) {
          console.error(`Security violation for ${fileId}:`, error.type, error.details);
        } else {
          console.error(`Failed to process ${fileId}:`, error);
        }
        // Continue with remaining files (partial batch failure is acceptable)
      }
    }

      return Object.fromEntries(results);
    } catch (error) {
      console.error('Failed to batch process:', error);

      // Special handling for validation errors
      if (error instanceof z.ZodError) {
        console.error('Invalid IPC message:', error.errors);
        throw new Error('Invalid request parameters');
      }

      // Special handling for security violations
      if (error instanceof SecurityViolationError) {
        console.error('Security violation:', error.type, error.details);
        throw new Error('File validation failed');
      }

      throw sanitizeError(error);
    }
  });

  // ============================================================================
  // ai:is-configured - Check if AI service configured
  // ============================================================================
  ipcMain.handle('ai:is-configured', async () => {
    return aiService !== null;
  });

  // ============================================================================
  // ai:get-config - Get AI config for UI (with masked API key)
  // ============================================================================
  ipcMain.handle('ai:get-config', async () => {
    return configManager.getAIConfigForUI();
  });

  // ============================================================================
  // ai:update-config - Update AI configuration + hot reload
  // ============================================================================
  ipcMain.handle('ai:update-config', async (_event, config: { provider: 'openai' | 'anthropic' | 'openrouter'; model: string; apiKey: string }) => {
    try {
      console.log('[ai:update-config] Received config update:', {
        provider: config.provider,
        model: config.model,
        hasApiKey: !!(config.apiKey && config.apiKey.trim() && config.apiKey !== '***')
      });

      // Only test connection if a new API key is provided
      if (config.apiKey && config.apiKey.trim() && config.apiKey !== '***') {
        console.log('[ai:update-config] Testing connection with new API key...');
        const testResult = await configManager.testAIConnection(config.provider, config.model, config.apiKey);
        if (!testResult.success) {
          console.log('[ai:update-config] Connection test failed:', testResult.error);
          return { success: false, error: testResult.error || 'Connection test failed' };
        }
        console.log('[ai:update-config] Connection test passed');
      } else {
        console.log('[ai:update-config] No new API key provided, skipping connection test');
      }

      // Save configuration (to Keychain + electron-store)
      // If apiKey is empty, configManager will keep existing Keychain key
      console.log('[ai:update-config] Saving config...');
      const saveResult = await configManager.saveAIConfig(config);
      if (!saveResult) {
        console.log('[ai:update-config] Save failed');
        return { success: false, error: 'Failed to save configuration' };
      }
      console.log('[ai:update-config] Config saved successfully');

      // Hot-reload aiService with new configuration
      console.log('[ai:update-config] Reloading AI service...');
      const newConfig = await (configManager.constructor as typeof import('../services/configManager').ConfigManager).getAIConfig();
      console.log('[ai:update-config] Loaded new config:', newConfig ? {
        provider: newConfig.provider,
        model: newConfig.model,
        hasApiKey: !!newConfig.apiKey
      } : null);

      if (newConfig) {
        const AIServiceClass = (await import('../services/aiService')).AIService;
        aiService = new AIServiceClass(newConfig.provider, newConfig.model, newConfig.apiKey);
        console.log('[ai:update-config] AI service reloaded with model:', newConfig.model);
      } else {
        aiService = null;
        console.log('[ai:update-config] AI service set to null (no config)');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update AI config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================================================
  // ai:test-connection - Test AI provider connection
  // ============================================================================
  ipcMain.handle('ai:test-connection', async (_event, provider: 'openai' | 'anthropic' | 'openrouter', model: string, apiKey: string) => {
    try {
      return await configManager.testAIConnection(provider, model, apiKey);
    } catch (error) {
      console.error('Failed to test AI connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================================================
  // ai:test-saved-connection - Test AI connection with saved Keychain key
  // ============================================================================
  ipcMain.handle('ai:test-saved-connection', async () => {
    try {
      return await configManager.testSavedAIConnection();
    } catch (error) {
      console.error('Failed to test saved AI connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================================================
  // ai:get-models - Get available models for provider
  // ============================================================================
  ipcMain.handle('ai:get-models', async (_event, provider: string) => {
    try {
      return await configManager.getAIModels(provider);
    } catch (error) {
      console.error('Failed to get models:', error);
      return [];
    }
  });

  // Return setAiService function for hot-reload capability
  return {
    setAiService: (service: AIService | null) => {
      aiService = service;
    }
  };
}

/**
 * Get current AI service instance
 *
 * SINGLE SOURCE OF TRUTH for aiService state.
 * This function provides access to the module-level aiService which is updated
 * by ai:update-config handler. Other modules (e.g., batch:start in main.ts)
 * should use this getter instead of maintaining separate aiService references
 * that can become stale.
 *
 * @returns Current AIService instance or null if not configured
 */
export function getAiService(): AIService | null {
  return aiService;
}
