export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export type ActionValidationResult = ValidationResult & {
  reason: string;
  suggestion?: string;
};

export type ResponseValidationResult = ValidationResult & {
  markers?: string[];
};

export type WorkspaceValidationResult<TStep extends string, TStepState> = ValidationResult & {
  stepErrors: Partial<Record<TStep, TStepState>>;
};
