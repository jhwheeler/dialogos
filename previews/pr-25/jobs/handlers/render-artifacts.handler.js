import { RenderArtifactsPayloadSchema } from "../../lib/queue/types.js";
export function createRenderArtifactsHandler() {
    return async (payload) => {
        const parsed = RenderArtifactsPayloadSchema.parse(payload);
        // Stub: In a later phase this will build transcript, summary, rubric,
        // and compute session metrics. For now it's a no-op.
        void parsed.sessionId;
    };
}
