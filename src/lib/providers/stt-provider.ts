// TODO: Add a `whisper-local` SttProvider that calls a self-hosted Whisper
// microservice (e.g. fedirz/faster-whisper-server or ahmetoner/whisper-asr-webservice)
// via HTTP. This avoids system Python dependencies by running Whisper in a
// separate container and exposes an OpenAI-compatible /v1/audio/transcriptions
// endpoint — so the OpenAI STT implementation may work as-is with a custom baseURL.

export interface SttProvider {
  transcribe(audio: Buffer, mimeType: string): Promise<string>;
}
