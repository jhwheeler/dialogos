export interface SttResult {
  text: string;
}

export interface SttProvider {
  /** Transcribe an audio buffer to text. */
  transcribe(audio: Buffer, mimeType: string): Promise<SttResult>;
}
