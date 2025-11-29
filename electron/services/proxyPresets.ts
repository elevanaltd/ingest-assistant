/**
 * Proxy Format Presets
 *
 * Validated proxy format configurations for video transcoding.
 * Extension is tied to codec (ProRes → .MOV, H.264 → .mp4).
 */

export interface ProxyPreset {
  id: string;
  name: string;
  codec: 'prores_ks' | 'libx264';
  profile?: number;  // ProRes profile (0=Proxy, 1=LT, 2=Standard, 3=HQ)
  crf?: number;      // H.264 quality (lower=better, 18-23 range)
  scale: string | null;  // null = original resolution
  extension: '.MOV' | '.mp4';
  description: string;
}

export const PROXY_PRESETS: ProxyPreset[] = [
  {
    id: '2k-prores-proxy',
    name: '2K ProRes Proxy (Recommended)',
    codec: 'prores_ks',
    profile: 0,
    scale: '2560:1440',
    extension: '.MOV',
    description: 'Sweet spot: 10-bit 4:2:2, low CPU, ~175MB/24s'
  },
  {
    id: '1080p-prores-proxy',
    name: '1080p ProRes Proxy',
    codec: 'prores_ks',
    profile: 0,
    scale: '1920:1080',
    extension: '.MOV',
    description: 'Storage-conscious: 10-bit 4:2:2, low CPU, ~78MB/24s'
  },
  {
    id: '4k-prores-proxy',
    name: '4K ProRes Proxy',
    codec: 'prores_ks',
    profile: 0,
    scale: null,  // Keep original 4K
    extension: '.MOV',
    description: 'Maximum quality: 10-bit 4:2:2, low CPU, ~363MB/24s'
  },
  {
    id: '2k-h264-crf23',
    name: '2K H.264 (Small Files)',
    codec: 'libx264',
    crf: 23,
    scale: '2560:1440',
    extension: '.mp4',
    description: 'Small files: 10-bit 4:2:2, higher CPU, ~25MB/24s'
  },
  {
    id: '1080p-h264-crf18',
    name: '1080p H.264 HQ (Smallest)',
    codec: 'libx264',
    crf: 18,
    scale: '1920:1080',
    extension: '.mp4',
    description: 'Smallest: 10-bit 4:2:2, higher CPU, ~15MB/24s'
  }
];

/**
 * Get preset by ID, returns default (2k-prores-proxy) if not found
 */
export function getPresetById(id: string | undefined): ProxyPreset {
  if (!id) {
    return PROXY_PRESETS[0]; // Default: 2k-prores-proxy
  }

  const preset = PROXY_PRESETS.find(p => p.id === id);
  return preset || PROXY_PRESETS[0]; // Fallback to default
}
