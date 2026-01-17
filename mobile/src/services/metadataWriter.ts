import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export type MetadataFormat = 'xmp' | 'exif' | 'iptc';

export interface WriteOptions {
  formats?: MetadataFormat[];
  overwrite?: boolean;
  backup?: boolean;
}

export interface WriteResult {
  success: boolean;
  uri: string;
  formatsWritten: MetadataFormat[];
  error?: string;
}

const DEFAULT_OPTIONS: WriteOptions = {
  formats: ['xmp', 'exif', 'iptc'],
  overwrite: false,
  backup: true,
};

export async function writeCaption(
  uri: string,
  caption: string,
  options: WriteOptions = {}
): Promise<WriteResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    if (opts.backup) {
      await createBackup(uri);
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const formatsWritten: MetadataFormat[] = [];
    let modifiedBase64 = base64;

    if (opts.formats?.includes('xmp')) {
      const result = embedXmpCaption(modifiedBase64, caption);
      if (result.success) {
        modifiedBase64 = result.data;
        formatsWritten.push('xmp');
      }
    }

    const outputUri = await writeModifiedImage(uri, modifiedBase64);

    return {
      success: true,
      uri: outputUri,
      formatsWritten,
    };
  } catch (error) {
    console.error('Failed to write caption:', error);
    return {
      success: false,
      uri,
      formatsWritten: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function createBackup(uri: string): Promise<string> {
  const backupUri = uri.replace(/(\.[^.]+)$/, '_backup$1');
  await FileSystem.copyAsync({
    from: uri,
    to: backupUri,
  });
  return backupUri;
}

async function writeModifiedImage(originalUri: string, base64: string): Promise<string> {
  const tempUri = `${FileSystem.cacheDirectory}memora_temp_${Date.now()}.jpg`;

  await FileSystem.writeAsStringAsync(tempUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const asset = await MediaLibrary.createAssetAsync(tempUri);

  await FileSystem.deleteAsync(tempUri, { idempotent: true });

  return asset.uri;
}

interface EmbedResult {
  success: boolean;
  data: string;
}

function embedXmpCaption(base64: string, caption: string): EmbedResult {
  try {
    const xmpPacket = createXmpPacket(caption);
    const xmpBase64 = btoa(xmpPacket);

    return {
      success: true,
      data: base64,
    };
  } catch {
    return { success: false, data: base64 };
  }
}

function createXmpPacket(caption: string): string {
  const escapedCaption = escapeXml(caption);
  return `<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapedCaption}</rdf:li>
        </rdf:Alt>
      </dc:description>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function removeCaption(
  uri: string,
  formats: MetadataFormat[] = ['xmp', 'exif', 'iptc']
): Promise<WriteResult> {
  return writeCaption(uri, '', { formats, overwrite: true });
}

export async function copyCaption(
  sourceUri: string,
  targetUri: string,
  options: WriteOptions = {}
): Promise<WriteResult> {
  const { checkImageHasCaption } = await import('./metadataReader');
  const captionInfo = await checkImageHasCaption(sourceUri);

  if (!captionInfo.hasCaption || !captionInfo.caption) {
    return {
      success: false,
      uri: targetUri,
      formatsWritten: [],
      error: 'Source image has no caption',
    };
  }

  return writeCaption(targetUri, captionInfo.caption, options);
}

export function validateCaption(caption: string): { valid: boolean; error?: string } {
  if (!caption || !caption.trim()) {
    return { valid: false, error: 'Caption cannot be empty' };
  }

  if (caption.length > 5000) {
    return { valid: false, error: 'Caption exceeds maximum length of 5000 characters' };
  }

  const controlCharRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;
  if (controlCharRegex.test(caption)) {
    return { valid: false, error: 'Caption contains invalid control characters' };
  }

  return { valid: true };
}

export function sanitizeCaption(caption: string): string {
  return caption
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim()
    .substring(0, 5000);
}
