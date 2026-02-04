export interface RuntimeConfigResponse {
  port: number;
  contextWindow: number;
  temperature: number;
  topP: number;
  openrouterModel: string;
  governorDevMode?: boolean | undefined;
}
