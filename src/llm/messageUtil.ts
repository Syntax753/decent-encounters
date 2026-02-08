import LLMMessage from "./types/LLMMessage";
import LLMMessages from "./types/LLMMessages";

let toolCallId = 0;

export function addUserMessageToChatHistory(messages: LLMMessages, prompt: string) {
  const lastMessage = messages.chatHistory.length > 0 ? messages.chatHistory[messages.chatHistory.length - 1] : null;
  if (lastMessage && lastMessage.role === 'user' && lastMessage.content === prompt) return;
  messages.chatHistory.push({ role: 'user', content: prompt });
  if (messages.chatHistory.length > messages.maxChatHistorySize) messages.chatHistory.shift();
}

export function addAssistantMessageToChatHistory(messages: LLMMessages, message: string) {
  messages.chatHistory.push({ role: 'assistant', content: message });
  if (messages.chatHistory.length > messages.maxChatHistorySize) messages.chatHistory.shift();
}

export function addToolMessageToChatHistory(messages: LLMMessages, message: string) {
  messages.chatHistory.push({ role: 'tool', content: message, tool_call_id: `${++toolCallId}` });
  if (messages.chatHistory.length > messages.maxChatHistorySize) messages.chatHistory.shift();
}

export function createChatHistory(messages: LLMMessages, prompt: string) {
  const chatHistory: LLMMessage[] = [];
  if (messages.systemMessage) chatHistory.push({ role: 'system', content: messages.systemMessage });
  for (const chatMessage of messages.chatHistory) { chatHistory.push(chatMessage); }
  const lastMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
  if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== prompt) {
    chatHistory.push({ role: 'user', content: prompt });
  }
  return chatHistory;
}