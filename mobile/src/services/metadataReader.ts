import * as FileSystem from 'expo-file-system';
import { MetadataInfo } from '../types';

export interface FullMetadata {
  xmp?: {
    description?: string;
    title?: string;
    creator?: string;
  };
  exif?: {
    imageDescription?: string;
    userComment?: string;
    make?: string;
    model?: string;
    dateTimeOriginal?: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
  };
  iptc?: {
    captionAbstract?: string;
    headline?: string;
    byline?: string;
    keywords?: string[];
  };
}

const GENERIC_CAPTION_PATTERNS = [
  /^IMG_\d+$/i,
  /^DSC_\d+$/i,
  /^DCIM_\d+$/i,
  /^Photo_\d+$/i,
  /^Screenshot_\d+$/i,
  /^\d{8}_\d{6}$/,
  /^image\d*$/i,
];

export function isGenericCaption(caption: string): boolean {
  const trimmed = caption.trim();
  if (!trimmed) return true;
  return GENERIC_CAPTION_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function detectCaptionQuality(caption: string | undefined | null): 'none' | 'generic' | 'meaningful' {
  if (!caption || !caption.trim()) {
    return 'none';
  }
  if (isGenericCaption(caption)) {
    return 'generic';
  }
  return 'meaningful';
}

export async function readMetadata(uri: string): Promise<FullMetadata> {
  return readMetadataFromBase64(uri);
}

export async function readMetadataFromBase64(uri: string): Promise<FullMetadata> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return parseMetadataFromBytes(base64);
  } catch (error) {
    console.error('Failed to read metadata:', error);
    return {};
  }
}

export function parseMetadataFromBytes(base64: string): FullMetadata {
  const metadata: FullMetadata = {};

  try {
    const bytes = base64ToBytes(base64.substring(0, 65536));
    
    const exifData = extractExifData(bytes);
    if (exifData) {
      metadata.exif = exifData;
    }

    const xmpData = extractXmpData(bytes);
    if (xmpData) {
      metadata.xmp = xmpData;
    }
  } catch (error) {
    console.error('Failed to parse metadata:', error);
  }

  return metadata;
}

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function extractExifData(bytes: Uint8Array): FullMetadata['exif'] | null {
  const exifMarkerIndex = findMarker(bytes, 0xe1);
  if (exifMarkerIndex === -1) return null;

  return {
    imageDescription: undefined,
  };
}

function extractXmpData(bytes: Uint8Array): FullMetadata['xmp'] | null {
  const xmpStart = findString(bytes, '<x:xmpmeta');
  if (xmpStart === -1) return null;

  const xmpEnd = findString(bytes, '</x:xmpmeta>', xmpStart);
  if (xmpEnd === -1) return null;

  const xmpBytes = bytes.slice(xmpStart, xmpEnd + 12);
  const xmpString = new TextDecoder().decode(xmpBytes);

  const description = extractXmpField(xmpString, 'dc:description');

  return {
    description: description ?? undefined,
  };
}

function findMarker(bytes: Uint8Array, marker: number): number {
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === marker) {
      return i;
    }
  }
  return -1;
}

function findString(bytes: Uint8Array, str: string, startIndex = 0): number {
  const strBytes = new TextEncoder().encode(str);
  outer: for (let i = startIndex; i < bytes.length - strBytes.length; i++) {
    for (let j = 0; j < strBytes.length; j++) {
      if (bytes[i + j] !== strBytes[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function extractXmpField(xmp: string, field: string): string | null {
  const patterns = [
    new RegExp(`<${field}[^>]*>\\s*<rdf:Alt[^>]*>\\s*<rdf:li[^>]*>([^<]+)</rdf:li>`, 'i'),
    new RegExp(`<${field}[^>]*>([^<]+)</${field}>`, 'i'),
    new RegExp(`${field}="([^"]+)"`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = xmp.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

export function getCaptionInfo(metadata: FullMetadata): MetadataInfo {
  if (metadata.xmp?.description) {
    const quality = detectCaptionQuality(metadata.xmp.description);
    if (quality === 'meaningful') {
      return {
        hasCaption: true,
        caption: metadata.xmp.description,
        source: 'xmp',
      };
    }
  }

  if (metadata.exif?.imageDescription) {
    const quality = detectCaptionQuality(metadata.exif.imageDescription);
    if (quality === 'meaningful') {
      return {
        hasCaption: true,
        caption: metadata.exif.imageDescription,
        source: 'exif',
      };
    }
  }

  if (metadata.iptc?.captionAbstract) {
    const quality = detectCaptionQuality(metadata.iptc.captionAbstract);
    if (quality === 'meaningful') {
      return {
        hasCaption: true,
        caption: metadata.iptc.captionAbstract,
        source: 'iptc',
      };
    }
  }

  return { hasCaption: false };
}

export async function checkImageHasCaption(uri: string): Promise<MetadataInfo> {
  const metadata = await readMetadata(uri);
  return getCaptionInfo(metadata);
}
