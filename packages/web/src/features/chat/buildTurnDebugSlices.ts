import type { TurnMetadata, TurnDebugSlice, IntentParams } from '../../types.js';

const PROMPT_SNIPPET_LIMIT = 900;

function formatPercent(value: number | undefined): string | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return `${(value * 100).toFixed(1)}%`;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function trimSnippet(value: string): string {
  if (value.length <= PROMPT_SNIPPET_LIMIT) return value;
  return `${value.slice(0, PROMPT_SNIPPET_LIMIT)}…`;
}

function buildParamSummary(params?: IntentParams): string | undefined {
  if (!params) return undefined;
  const entries = Object.entries(params).filter(
    ([, val]) =>
      typeof val === 'number' || typeof val === 'string' || (val && typeof val === 'object')
  );
  if (!entries.length) return undefined;
  return entries
    .map(([key, val]) =>
      typeof val === 'object' && val !== null
        ? `${key}=${safeStringify(val)}`
        : `${key}=${String(val)}`
    )
    .join(', ');
}

function asJsonString(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return trimmed;
    }
  }
  return safeStringify(value);
}

export function buildTurnDebugSlices(metadata?: TurnMetadata): TurnDebugSlice[] {
  if (!metadata) return [];

  const slices: TurnDebugSlice[] = [];
  const { intent, intentDebug } = metadata;

  if (intent) {
    const lines: string[] = [];
    lines.push(`Type: ${intent.type}`);
    const confidenceText = formatPercent(intent.confidence);
    if (confidenceText) {
      lines.push(`Confidence: ${confidenceText}`);
    }
    const paramsSummary = buildParamSummary(intent.params);
    if (paramsSummary) {
      lines.push(`Parameters: ${paramsSummary}`);
    }
    if (intent.signals?.length) {
      lines.push(`Signals: ${intent.signals.join(', ')}`);
    }
    if (metadata.phaseTiming?.intentDetectionMs) {
      lines.push(`Detector time: ${metadata.phaseTiming.intentDetectionMs.toFixed(0)}ms`);
    }

    const detectorInfo = intentDebug?.detector
      ? `${intentDebug.detector}${intentDebug.model ? ` (${intentDebug.model})` : ''}`
      : undefined;

    const intentSlice: TurnDebugSlice = {
      id: 'intent-summary',
      title: 'Intent Detection',
      variant: 'intent',
      body: { kind: 'text', lines },
    };
    if (detectorInfo) {
      intentSlice.description = detectorInfo;
    }
    slices.push(intentSlice);
  }

  if (intentDebug?.prompt) {
    const snippet = `// system\n${trimSnippet(intentDebug.prompt.system)}\n\n// user\n${trimSnippet(
      intentDebug.prompt.user
    )}`;
    const promptSlice: TurnDebugSlice = {
      id: 'prompt-snapshot',
      title: 'Prompt Snapshot',
      variant: 'prompt',
      body: { kind: 'code', label: 'Intent Detector Prompt', value: snippet },
    };
    if (intentDebug.historyPreview?.length) {
      promptSlice.description = `History preview (${intentDebug.historyPreview.length} lines)`;
    }
    slices.push(promptSlice);
  }

  if (intentDebug?.contextSummary?.length) {
    slices.push({
      id: 'context-summary',
      title: 'Context Signals',
      variant: 'prompt',
      body: { kind: 'list', items: intentDebug.contextSummary },
    });
  }

  if (intentDebug?.rawResponse) {
    slices.push({
      id: 'detector-raw',
      title: 'Detector Raw Response',
      variant: 'raw',
      body: { kind: 'json', value: asJsonString(intentDebug.rawResponse) },
    });
  }

  if (intentDebug?.parsed !== undefined) {
    slices.push({
      id: 'detector-parsed',
      title: 'Parsed Payload',
      variant: 'raw',
      body: { kind: 'json', value: asJsonString(intentDebug.parsed) },
    });
  }

  if (intentDebug?.warnings?.length) {
    slices.push({
      id: 'detector-warnings',
      title: 'Detector Warnings',
      variant: 'raw',
      body: { kind: 'list', items: intentDebug.warnings },
    });
  }

  if (metadata.agentsInvoked.length) {
    slices.push({
      id: 'agents-invoked',
      title: 'Agents Invoked',
      variant: 'agent',
      body: { kind: 'list', items: metadata.agentsInvoked.map((agent) => agent.toUpperCase()) },
    });
  }

  if (metadata.agentOutputs?.length) {
    metadata.agentOutputs.forEach((output, idx) => {
      const lines: string[] = [];
      if (output.narrative) {
        lines.push(output.narrative.trim());
      }
      if (output.diagnostics?.executionTimeMs) {
        lines.push(`Execution: ${output.diagnostics.executionTimeMs.toFixed(0)}ms`);
      }
      if (output.diagnostics?.warnings?.length) {
        lines.push(`Warnings: ${output.diagnostics.warnings.join('; ')}`);
      }
      if (output.continueProcessing) {
        lines.push('Requested follow-up processing');
      }

      slices.push({
        id: `agent-output-${idx}`,
        title: `Agent Output #${idx + 1}`,
        variant: 'agent',
        body: { kind: 'text', lines: lines.length ? lines : ['No narrative returned.'] },
      });
    });
  }

  return slices;
}
