import * as fs from 'fs';
import * as path from 'path';
import { VoiceGender } from '../../shared/types';

export class AudioClipsService {
  private baseDirs: string[] = [];
  private lastPlayedIndex: Map<string, number> = new Map();

  constructor(workspaceRoot?: string) {
    if (workspaceRoot) {
      this.baseDirs.push(path.join(workspaceRoot, 'trainingVoice'));
      this.baseDirs.push(path.join(workspaceRoot, 'media', 'voices'));
    }
  }

  public addSearchDirectory(dir: string): void {
    if (fs.existsSync(dir) && !this.baseDirs.includes(dir)) {
      this.baseDirs.push(dir);
    }
  }

  /**
   * Find all audio files for the given persona across trainingVoice/ and media/voices/
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

    return audioFiles;
  }

  /**
   * Return a base64 Data URI of a real audio clip for the given persona
   */
  public getRandomClipDataUri(persona: VoiceGender): string | undefined {
    const clips = this.getClipsForPersona(persona);
    if (clips.length === 0) {
      return undefined;
    }

    let currentIndex = this.lastPlayedIndex.get(persona) ?? -1;
    let nextIndex = (currentIndex + 1) % clips.length;
    this.lastPlayedIndex.set(persona, nextIndex);

    const chosenFile = clips[nextIndex];
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
