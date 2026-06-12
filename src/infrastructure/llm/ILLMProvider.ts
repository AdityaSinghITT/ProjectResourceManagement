export interface ILLMProvider {
  complete(prompt: string): Promise<string>;
}
