import { NotFoundError } from "../../errors/not-found-error.js";
import { buildPromptContext } from "../../lib/socratic/prompt-builder.js";
import { runEnforcementLoop } from "../../lib/socratic/enforcement-loop.js";
import { PROMPT_TYPE_VALUES, DETECTED_ISSUE_VALUES } from "../../lib/socratic/types.js";
export class PromptGenerationService {
    turnDataSource;
    sessionDataSource;
    topicDataSource;
    sourceDataSource;
    llmProvider;
    constructor(turnDataSource, sessionDataSource, topicDataSource, sourceDataSource, llmProvider) {
        this.turnDataSource = turnDataSource;
        this.sessionDataSource = sessionDataSource;
        this.topicDataSource = topicDataSource;
        this.sourceDataSource = sourceDataSource;
        this.llmProvider = llmProvider;
    }
    async generate(turn) {
        if (!turn.studentText) {
            throw new Error("Cannot generate prompt without student text");
        }
        const session = await this.sessionDataSource.getOne({ id: turn.sessionId });
        if (!session) {
            throw new NotFoundError(`Session not found: ${turn.sessionId}`);
        }
        const topic = await this.topicDataSource.getOne({ id: session.topicId });
        if (!topic) {
            throw new NotFoundError(`Topic not found: ${session.topicId}`);
        }
        // Fetch source if session has one
        let source = null;
        if (session.sourceId) {
            source = await this.sourceDataSource.getOne({ id: session.sourceId });
            if (!source) {
                throw new NotFoundError(`Source not found: ${session.sourceId}`);
            }
        }
        // Fetch prior turns (last 6)
        const allTurns = await this.turnDataSource.getMany({ sessionId: turn.sessionId });
        const priorTurns = allTurns
            .filter((t) => t.id !== turn.id)
            .map((t) => ({
            studentText: t.studentText,
            assistantText: t.assistantText,
        }));
        const context = buildPromptContext({
            studentText: turn.studentText,
            triviumStage: session.triviumStage,
            topicTitle: topic.title,
            topicDescription: topic.description,
            sourceTitle: source?.title,
            sourceCitation: source?.citation,
            sourceExtractedText: source?.extractedText,
            groundingTier: source?.groundingTier,
            priorTurns,
        });
        const startTime = Date.now();
        const result = await runEnforcementLoop(this.llmProvider, context);
        const latencyMs = Date.now() - startTime;
        // Validate enums at persistence layer — coerce invalid values to safe defaults
        const promptType = PROMPT_TYPE_VALUES.includes(result.promptType)
            ? result.promptType
            : "clarify";
        const detectedIssue = DETECTED_ISSUE_VALUES.includes(result.detectedIssue)
            ? result.detectedIssue
            : "none";
        return {
            assistantText: result.nextPrompt,
            assistantPromptType: promptType,
            assistantDetectedIssue: detectedIssue,
            latencyMs,
        };
    }
}
