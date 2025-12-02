import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BatchActionButtons } from './BatchActionButtons';

/**
 * TDD RED Phase: BatchActionButtons component tests
 *
 * Purpose: Extract button group from BatchOperationsPanel
 * Scope: Lines ~319-437 (button rendering logic)
 *
 * Features:
 * - Conditional rendering based on isProcessing state
 * - "Process Selected" vs regular batch button logic
 * - Reprocess button
 * - Generate Proxies button
 * - Cancel button
 */

describe('BatchActionButtons', () => {
  it('should render "Process Selected" button when files are selected', () => {
    render(
      <BatchActionButtons
        isProcessing={false}
        selectedCount={3}
        unprocessedCount={5}
        totalFiles={10}
        videoCount={4}
        onProcessSelected={vi.fn()}
        onStartBatch={vi.fn()}
        onReprocess={vi.fn()}
        onGenerateProxies={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /process selected.*3.*file/i })).toBeInTheDocument();
  });

  it('should render regular "AI Process" button when no files selected', () => {
    render(
      <BatchActionButtons
        isProcessing={false}
        selectedCount={0}
        unprocessedCount={5}
        totalFiles={10}
        videoCount={0}
        onProcessSelected={vi.fn()}
        onStartBatch={vi.fn()}
        onReprocess={vi.fn()}
        onGenerateProxies={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /^AI Process 5 Files$/i })).toBeInTheDocument();
  });

  it('should render "Reprocess" button when totalFiles > 0', () => {
    render(
      <BatchActionButtons
        isProcessing={false}
        selectedCount={0}
        unprocessedCount={0}
        totalFiles={5}
        videoCount={0}
        onProcessSelected={vi.fn()}
        onStartBatch={vi.fn()}
        onReprocess={vi.fn()}
        onGenerateProxies={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /AI Reprocess All 5 Files/i })).toBeInTheDocument();
  });

  it('should render "Generate Proxies" button', () => {
    render(
      <BatchActionButtons
        isProcessing={false}
        selectedCount={0}
        unprocessedCount={0}
        totalFiles={5}
        videoCount={3}
        onProcessSelected={vi.fn()}
        onStartBatch={vi.fn()}
        onReprocess={vi.fn()}
        onGenerateProxies={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /generate proxies for 3 videos/i })).toBeInTheDocument();
  });

  it('should render "Cancel Processing" button when isProcessing is true', () => {
    render(
      <BatchActionButtons
        isProcessing={true}
        selectedCount={0}
        unprocessedCount={5}
        totalFiles={10}
        videoCount={0}
        onProcessSelected={vi.fn()}
        onStartBatch={vi.fn()}
        onReprocess={vi.fn()}
        onGenerateProxies={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /cancel processing/i })).toBeInTheDocument();
  });

  it('should NOT render action buttons when isProcessing is true', () => {
    render(
      <BatchActionButtons
        isProcessing={true}
        selectedCount={0}
        unprocessedCount={5}
        totalFiles={10}
        videoCount={0}
        onProcessSelected={vi.fn()}
        onStartBatch={vi.fn()}
        onReprocess={vi.fn()}
        onGenerateProxies={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Should NOT show process/reprocess/proxy buttons
    expect(screen.queryByRole('button', { name: /AI Process/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /AI Reprocess/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generate proxies/i })).not.toBeInTheDocument();
  });

  it('should call onProcessSelected when "Process Selected" button clicked', () => {
    const handleProcessSelected = vi.fn();

    render(
      <BatchActionButtons
        isProcessing={false}
        selectedCount={3}
        unprocessedCount={5}
        totalFiles={10}
        videoCount={0}
        onProcessSelected={handleProcessSelected}
        onStartBatch={vi.fn()}
        onReprocess={vi.fn()}
        onGenerateProxies={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /process selected.*3.*file/i });
    button.click();

    expect(handleProcessSelected).toHaveBeenCalledTimes(1);
  });

  it('should call onStartBatch when regular process button clicked', () => {
    const handleStartBatch = vi.fn();

    render(
      <BatchActionButtons
        isProcessing={false}
        selectedCount={0}
        unprocessedCount={5}
        totalFiles={10}
        videoCount={0}
        onProcessSelected={vi.fn()}
        onStartBatch={handleStartBatch}
        onReprocess={vi.fn()}
        onGenerateProxies={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /^AI Process 5 Files$/i });
    button.click();

    expect(handleStartBatch).toHaveBeenCalledTimes(1);
  });

  it('should call onReprocess when reprocess button clicked', () => {
    const handleReprocess = vi.fn();

    render(
      <BatchActionButtons
        isProcessing={false}
        selectedCount={0}
        unprocessedCount={0}
        totalFiles={5}
        videoCount={0}
        onProcessSelected={vi.fn()}
        onStartBatch={vi.fn()}
        onReprocess={handleReprocess}
        onGenerateProxies={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /AI Reprocess All 5 Files/i });
    button.click();

    expect(handleReprocess).toHaveBeenCalledTimes(1);
  });

  it('should call onGenerateProxies when proxy button clicked', () => {
    const handleGenerateProxies = vi.fn();

    render(
      <BatchActionButtons
        isProcessing={false}
        selectedCount={0}
        unprocessedCount={0}
        totalFiles={5}
        videoCount={3}
        onProcessSelected={vi.fn()}
        onStartBatch={vi.fn()}
        onReprocess={vi.fn()}
        onGenerateProxies={handleGenerateProxies}
        onCancel={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /generate proxies for 3 videos/i });
    button.click();

    expect(handleGenerateProxies).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button clicked', () => {
    const handleCancel = vi.fn();

    render(
      <BatchActionButtons
        isProcessing={true}
        selectedCount={0}
        unprocessedCount={5}
        totalFiles={10}
        videoCount={0}
        onProcessSelected={vi.fn()}
        onStartBatch={vi.fn()}
        onReprocess={vi.fn()}
        onGenerateProxies={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const button = screen.getByRole('button', { name: /cancel processing/i });
    button.click();

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('should disable process button when no unprocessed files', () => {
    render(
      <BatchActionButtons
        isProcessing={false}
        selectedCount={0}
        unprocessedCount={0}
        totalFiles={5}
        videoCount={0}
        onProcessSelected={vi.fn()}
        onStartBatch={vi.fn()}
        onReprocess={vi.fn()}
        onGenerateProxies={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /no files to process/i });
    expect(button).toBeDisabled();
  });

  it('should disable proxy button when no videos', () => {
    render(
      <BatchActionButtons
        isProcessing={false}
        selectedCount={0}
        unprocessedCount={0}
        totalFiles={5}
        videoCount={0}
        onProcessSelected={vi.fn()}
        onStartBatch={vi.fn()}
        onReprocess={vi.fn()}
        onGenerateProxies={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /no videos to process/i });
    expect(button).toBeDisabled();
  });

  it('should show "First 100 Files" label when unprocessedCount > 100', () => {
    render(
      <BatchActionButtons
        isProcessing={false}
        selectedCount={0}
        unprocessedCount={150}
        totalFiles={200}
        videoCount={0}
        onProcessSelected={vi.fn()}
        onStartBatch={vi.fn()}
        onReprocess={vi.fn()}
        onGenerateProxies={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /AI Process First 100 Files/i })).toBeInTheDocument();
  });

  it('should show "First 100 Files" label for reprocess when totalFiles > 100', () => {
    render(
      <BatchActionButtons
        isProcessing={false}
        selectedCount={0}
        unprocessedCount={0}
        totalFiles={150}
        videoCount={0}
        onProcessSelected={vi.fn()}
        onStartBatch={vi.fn()}
        onReprocess={vi.fn()}
        onGenerateProxies={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /AI Reprocess First 100 Files/i })).toBeInTheDocument();
  });
});
