import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class MetadataWriter {
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
    if (tags.length > 0) {
      const keywordsStr = tags.join(', ');
      commands.push(`-Keywords="${keywordsStr}"`);
      commands.push(`-XMP:Subject="${keywordsStr}"`);
      commands.push(`-IPTC:Keywords="${keywordsStr}"`);
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
      const { stdout, stderr } = await execAsync(exiftoolCmd);
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
          keywords: metadata.Keywords ?
            (Array.isArray(metadata.Keywords) ? metadata.Keywords : [metadata.Keywords]) :
            [],
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
