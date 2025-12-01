import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MediaViewer } from './MediaViewer';

describe('MediaViewer', () => {
  it('renders image when fileType is image', () => {
    render(
      <MediaViewer
        fileType="image"
        filename="test.jpg"
        mediaDataUrl="data:image/jpeg;base64,test"
        isLoadingMedia={false}
        codecWarning=""
        transcodeProgress=""
        transcodePercentage={0}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,test');
    expect(img).toHaveAttribute('alt', 'test.jpg');
  });

  it('renders video when fileType is video', () => {
    render(
      <MediaViewer
        fileType="video"
        filename="test.mov"
        mediaDataUrl="data:video/mp4;base64,test"
        isLoadingMedia={false}
        codecWarning=""
        transcodeProgress=""
        transcodePercentage={0}
      />
    );

    // Video element should be present
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'data:video/mp4;base64,test');
  });

  it('shows loading overlay when isLoadingMedia is true', () => {
    render(
      <MediaViewer
        fileType="image"
        filename="test.jpg"
        mediaDataUrl=""
        isLoadingMedia={true}
        codecWarning=""
        transcodeProgress=""
        transcodePercentage={0}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows transcode progress when transcoding', () => {
    render(
      <MediaViewer
        fileType="video"
        filename="test.mov"
        mediaDataUrl=""
        isLoadingMedia={true}
        codecWarning=""
        transcodeProgress="00:00:05"
        transcodePercentage={42}
      />
    );

    expect(screen.getByText('Transcoding: 42%')).toBeInTheDocument();
  });

  it('shows codec warning when present', () => {
    const warning = 'HEVC codec not supported';
    render(
      <MediaViewer
        fileType="video"
        filename="test.mov"
        mediaDataUrl="data:video/mp4;base64,test"
        isLoadingMedia={false}
        codecWarning={warning}
        transcodeProgress=""
        transcodePercentage={0}
      />
    );

    expect(screen.getByText(warning)).toBeInTheDocument();
  });

  it('shows "Loading media..." when no mediaDataUrl', () => {
    render(
      <MediaViewer
        fileType="image"
        filename="test.jpg"
        mediaDataUrl=""
        isLoadingMedia={false}
        codecWarning=""
        transcodeProgress=""
        transcodePercentage={0}
      />
    );

    expect(screen.getByText('Loading media...')).toBeInTheDocument();
  });
});
