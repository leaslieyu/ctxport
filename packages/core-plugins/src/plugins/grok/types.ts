/** Represents a message extracted from the Grok DOM */
export interface GrokDomMessage {
  role: "user" | "assistant";
  text: string;
}
