import * as fs from 'fs';
import * as path from 'path';
import { VoiceGender } from '../../shared/types';

export class AudioClipsService {
  private baseDirs: string[] = [];
  private lastPlayedIndex: Map<string, number> = new Map();

  constructor(workspaceRoot?: string) {
    if (workspaceRoot) {
      this.addSearchDirectory(workspaceRoot);
    }
  }

  public addSearchDirectory(dir: string): void {
    if (fs.existsSync(dir)) {
      if (!this.baseDirs.includes(dir)) this.baseDirs.push(dir);
      const tv = path.join(dir, 'trainingVoice');
      if (fs.existsSync(tv) && !this.baseDirs.includes(tv)) this.baseDirs.push(tv);
      const mv = path.join(dir, 'media', 'voices');
      if (fs.existsSync(mv) && !this.baseDirs.includes(mv)) this.baseDirs.push(mv);
    }
  }

  /**
   * Find all unique audio files for the given persona across trainingVoice/ and media/voices/
   */
  public getClipsForPersona(persona: VoiceGender): string[] {
    const audioFiles: string[] = [];
    const targetFolder = persona === 'female' ? 'maya' : persona === 'male' ? 'vadivelu' : persona;

    for (const baseDir of this.baseDirs) {
      const personaDir = path.join(baseDir, targetFolder);
      if (fs.existsSync(personaDir)) {
        try {
          const files = fs.readdirSync(personaDir);
          for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
              audioFiles.push(path.join(personaDir, file));
            }
          }
        } catch (e) {
          console.warn(`[AudioClipsService] Failed to read dir ${personaDir}:`, e);
        }
      }
    }

    // Deduplicate by filename
    const seenNames = new Set<string>();
    const uniqueFiles: string[] = [];
    for (const file of audioFiles) {
      const name = path.basename(file).toLowerCase();
      if (!seenNames.has(name)) {
        seenNames.add(name);
        uniqueFiles.push(file);
      }
    }

    return uniqueFiles;
  }

  /**
   * Return the absolute file path of a clip
   */
  public getRandomClipFile(persona: VoiceGender): string | undefined {
    const clips = this.getClipsForPersona(persona);
    if (clips.length === 0) {
      return undefined;
    }

    let currentIndex = this.lastPlayedIndex.get(persona) ?? -1;
    let nextIndex = (currentIndex + 1) % clips.length;
    this.lastPlayedIndex.set(persona, nextIndex);

    return clips[nextIndex];
  }

  /**
   * Return a base64 Data URI of a real audio clip for the given persona
   */
  public getRandomClipDataUri(persona: VoiceGender): string | undefined {
    const chosenFile = this.getRandomClipFile(persona);
    if (!chosenFile) return undefined;

    try {
      const buffer = fs.readFileSync(chosenFile);
      const ext = path.extname(chosenFile).toLowerCase().replace('.', '');
      const mime = ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : 'audio/mp3';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (err) {
      console.error(`[AudioClipsService] Error reading audio file ${chosenFile}:`, err);
      return undefined;
    }
  }

  public hasClips(persona: VoiceGender): boolean {
    return this.getClipsForPersona(persona).length > 0;
  }
}
