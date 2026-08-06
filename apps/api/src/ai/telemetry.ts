export type AiCallLog = {
  feature: string;
  provider: string;
  model: string;
  briefId?: string | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  costUsd?: number | null;
  latencyMs?: number | null;
  succeeded: boolean;
  errorKind?: string | null;
};

export type AiCallLogger = (row: AiCallLog) => Promise<void>;
