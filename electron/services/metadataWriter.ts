import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class MetadataWriter {
  /**
   * Parse keywords from exiftool output
   * exiftool may return keywords in different formats:
   * - Array with comma-separated string: ['tag1, tag2, tag3'] (most common when we write multiple tags)
   * - Array of strings: ['tag1', 'tag2']
   * - Single string: 'tag1'
   * - Comma-separated string: 'tag1, tag2, tag3'
   */
  private parseKeywords(keywords: string | string[] | undefined): string[] {
    if (!keywords) {
      return [];
    }

    // Handle array - check each element for commas
    if (Array.isArray(keywords)) {
      // Flatten array by splitting any comma-separated elements
      return keywords.flatMap(keyword => {
        if (typeof keyword === 'string' && keyword.includes(',')) {
          return keyword.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }
        return keyword;
      });
    }

    // Single string - check if it contains commas
    if (typeof keywords === 'string') {
      if (keywords.includes(',')) {
        return keywords.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
      return [keywords];
    }

    return [];
  }

  /**
   * Write metadata directly into the file using exiftool
   * This embeds EXIF/XMP metadata that Premiere Pro and other tools can read
   */
  async writeMetadataToFile(
    filePath: string,
    mainName: string,
    tags: string[]
  ): Promise<void> {
    const commands: string[] = [];

    // Title/DocumentTitle - Main descriptive name
    if (mainName) {
      commands.push(`-Title="${mainName}"`);
      commands.push(`-XMP:Title="${mainName}"`);
      commands.push(`-IPTC:ObjectName="${mainName}"`);
    }

    // Keywords - Array of tags
    // Write each tag individually so exiftool creates proper array structure
    // This ensures Premiere Pro and other tools see them as separate searchable keywords
    // Note: -Keywords writes to IPTC:Keywords, -XMP:Subject writes to XMP namespace
    if (tags.length > 0) {
      tags.forEach(tag => {
        commands.push(`-Keywords="${tag}"`);
        commands.push(`-XMP:Subject="${tag}"`);
      });
    }

    // Description - Combine for searchability
    const description = mainName + (tags.length > 0 ? ` - ${tags.join(', ')}` : '');
    commands.push(`-Description="${description}"`);
    commands.push(`-XMP:Description="${description}"`);
    commands.push(`-IPTC:Caption-Abstract="${description}"`);

    // Don't create backup files
    commands.push('-overwrite_original');

    // Build the full command
    const exiftoolCmd = `exiftool ${commands.join(' ')} "${filePath}"`;

    try {
      const { stderr } = await execAsync(exiftoolCmd);
      if (stderr && !stderr.includes('1 image files updated')) {
        console.error('exiftool stderr:', stderr);
      }
      console.log('Metadata written to file:', filePath);
    } catch (error) {
      console.error('Failed to write metadata to file:', error);
      throw error;
    }
  }

  /**
   * Read metadata from file using exiftool
   */
  async readMetadataFromFile(filePath: string): Promise<{
    title?: string;
    keywords?: string[];
    description?: string;
  }> {
    try {
      const { stdout } = await execAsync(
        `exiftool -Title -Keywords -Description -json "${filePath}"`
      );
      const data = JSON.parse(stdout);

      if (data && data.length > 0) {
        const metadata = data[0];
        return {
          title: metadata.Title,
          keywords: this.parseKeywords(metadata.Keywords),
          description: metadata.Description,
        };
      }

      return {};
    } catch (error) {
      console.error('Failed to read metadata from file:', error);
      return {};
    }
  }
}
