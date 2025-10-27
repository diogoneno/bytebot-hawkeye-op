import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { APIUserAbortError } from 'openai';
import {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
} from 'openai/resources/chat/completions';
import {
  MessageContentBlock,
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
  ToolResultContentBlock,
  ThinkingContentBlock,
  ImageContentBlock,
  isUserActionContentBlock,
  isComputerToolUseContentBlock,
  isImageContentBlock,
} from '@bytebot/shared';
import { DEFAULT_MODEL, detectApiType, OpenAIApiType } from './openai.constants';
import { Message, Role } from '@prisma/client';
import { openaiTools, openaiChatTools } from './openai.tools';
import {
  BytebotAgentService,
  BytebotAgentInterrupt,
  BytebotAgentResponse,
} from '../agent/agent.types';

@Injectable()
export class OpenAIService implements BytebotAgentService {
  private openai: OpenAI | null = null;
  private currentApiKey: string | null = null;
  private hasLoggedMissingKey = false;
  private readonly logger = new Logger(OpenAIService.name);

  constructor(private readonly configService: ConfigService) {
    this.initializeClient();
  }

  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string = DEFAULT_MODEL.name,
    useTools: boolean = true,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    const apiType = detectApiType(model);

    if (apiType === 'responses') {
      return this.generateMessageWithResponses(
        systemPrompt,
        messages,
        model,
        useTools,
        signal,
      );
    } else {
      return this.generateMessageWithChat(
        systemPrompt,
        messages,
        model,
        useTools,
        signal,
      );
    }
  }

  /**
   * Generate message using Chat Completions API
   * Used for: gpt-4o, gpt-4-turbo, gpt-3.5-turbo, etc.
   */
  private async generateMessageWithChat(
    systemPrompt: string,
    messages: Message[],
    model: string,
    useTools: boolean,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    try {
      const openaiClient = this.getOpenAIClient();
      const chatMessages = this.formatMessagesForChatCompletion(
        systemPrompt,
        messages,
      );

      // Detect reasoning models (o1/o3 series) that support reasoning_effort
      const isReasoningModel = /\bo1\b|\bo3\b/i.test(model);

      const completionRequest: OpenAI.Chat.ChatCompletionCreateParams = {
        model,
        messages: chatMessages,
        max_tokens: 8192,
        ...(useTools && { tools: openaiChatTools }),
        ...(isReasoningModel && { reasoning_effort: 'high' }),
      };

      const completion = await openaiClient.chat.completions.create(
        completionRequest,
        { signal },
      );

      const choice = completion.choices[0];
      if (!choice || !choice.message) {
        this.logger.error(
          `No valid response from Chat Completion API for model ${model}`,
        );
        throw new Error('No valid response from Chat Completion API');
      }

      const contentBlocks = this.formatChatCompletionResponse(choice.message);

      return {
        contentBlocks,
        tokenUsage: {
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      if (error instanceof APIUserAbortError) {
        this.logger.log('OpenAI Chat Completion API call aborted');
        throw new BytebotAgentInterrupt();
      }
      this.logger.error(
        `Error sending message to OpenAI Chat Completion: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate message using Responses API
   * Used for: o-series (o1, o3), gpt-4.1+
   */
  private async generateMessageWithResponses(
    systemPrompt: string,
    messages: Message[],
    model: string,
    useTools: boolean,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    const isReasoning = model.startsWith('o');
    try {
      const openaiClient = this.getOpenAIClient();
      const openaiMessages = this.formatMessagesForOpenAI(messages);

      const maxTokens = 8192;
      const response = await openaiClient.responses.create(
        {
          model,
          max_output_tokens: maxTokens,
          input: openaiMessages,
          instructions: systemPrompt,
          tools: useTools ? openaiTools : [],
          reasoning: isReasoning ? { effort: 'medium' } : null,
          store: false,
          include: isReasoning ? ['reasoning.encrypted_content'] : [],
        },
        { signal },
      );

      return {
        contentBlocks: this.formatOpenAIResponse(response.output),
        tokenUsage: {
          inputTokens: response.usage?.input_tokens || 0,
          outputTokens: response.usage?.output_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      if (error instanceof APIUserAbortError) {
        this.logger.log('OpenAI Responses API call aborted');
        throw new BytebotAgentInterrupt();
      }
      this.logger.error(
        `Error sending message to OpenAI Responses API: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private initializeClient() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logMissingKey();
      this.openai = new OpenAI({
        apiKey: 'dummy-key-for-initialization',
      });
      this.currentApiKey = null;
      return;
    }

    this.openai = new OpenAI({ apiKey });
    this.currentApiKey = apiKey;
    this.hasLoggedMissingKey = false;
  }

  private getOpenAIClient(): OpenAI {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (apiKey && apiKey !== this.currentApiKey) {
      this.openai = new OpenAI({ apiKey });
      this.currentApiKey = apiKey;
      this.hasLoggedMissingKey = false;
    }

    if (!apiKey) {
      this.logMissingKey();

      if (!this.openai) {
        this.openai = new OpenAI({
          apiKey: 'dummy-key-for-initialization',
        });
      }

      this.currentApiKey = null;
    }

    return this.openai!;
  }

  private logMissingKey() {
    if (!this.hasLoggedMissingKey) {
      this.logger.warn(
        'OPENAI_API_KEY is not set. OpenAIService will not work properly.',
      );
      this.hasLoggedMissingKey = true;
    }
  }

  private formatMessagesForOpenAI(
    messages: Message[],
  ): OpenAI.Responses.ResponseInputItem[] {
    const openaiMessages: OpenAI.Responses.ResponseInputItem[] = [];

    for (const message of messages) {
      const messageContentBlocks = message.content as MessageContentBlock[];

      if (
        messageContentBlocks.every((block) => isUserActionContentBlock(block))
      ) {
        const userActionContentBlocks = messageContentBlocks.flatMap(
          (block) => block.content,
        );
        for (const block of userActionContentBlocks) {
          if (isComputerToolUseContentBlock(block)) {
            openaiMessages.push({
              type: 'message',
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: `User performed action: ${block.name}\n${JSON.stringify(block.input, null, 2)}`,
                },
              ],
            });
          } else if (isImageContentBlock(block)) {
            openaiMessages.push({
              role: 'user',
              type: 'message',
              content: [
                {
                  type: 'input_image',
                  detail: 'high',
                  image_url: `data:${block.source.media_type};base64,${block.source.data}`,
                },
              ],
            } as OpenAI.Responses.ResponseInputItem.Message);
          }
        }
      } else {
        // Convert content blocks to OpenAI format
        for (const block of messageContentBlocks) {
          switch (block.type) {
            case MessageContentType.Text: {
              if (message.role === Role.USER) {
                openaiMessages.push({
                  type: 'message',
                  role: 'user',
                  content: [
                    {
                      type: 'input_text',
                      text: block.text,
                    },
                  ],
                } as OpenAI.Responses.ResponseInputItem.Message);
              } else {
                openaiMessages.push({
                  type: 'message',
                  role: 'assistant',
                  content: [
                    {
                      type: 'output_text',
                      text: block.text,
                    },
                  ],
                } as OpenAI.Responses.ResponseOutputMessage);
              }
              break;
            }
            case MessageContentType.ToolUse:
              // For assistant messages with tool use, convert to function call
              if (message.role === Role.ASSISTANT) {
                const toolBlock = block as ToolUseContentBlock;
                openaiMessages.push({
                  type: 'function_call',
                  call_id: toolBlock.id,
                  name: toolBlock.name,
                  arguments: JSON.stringify(toolBlock.input),
                } as OpenAI.Responses.ResponseFunctionToolCall);
              }
              break;

            case MessageContentType.Thinking: {
              const thinkingBlock = block;
              openaiMessages.push({
                type: 'reasoning',
                id: thinkingBlock.signature,
                encrypted_content: thinkingBlock.thinking,
                summary: [],
              } as OpenAI.Responses.ResponseReasoningItem);
              break;
            }
            case MessageContentType.ToolResult: {
              // Handle tool results - collect images separately
              const toolResult = block;
              const pendingImages: ImageContentBlock[] = [];

              for (const content of toolResult.content) {
                if (content.type === MessageContentType.Text) {
                  openaiMessages.push({
                    type: 'function_call_output',
                    call_id: toolResult.tool_use_id,
                    output: content.text,
                  } as OpenAI.Responses.ResponseInputItem.FunctionCallOutput);
                } else if (content.type === MessageContentType.Image) {
                  // Collect images to send separately
                  pendingImages.push(content);
                }
              }

              // Send images as separate user messages (consistent with Chat API)
              if (pendingImages.length > 0) {
                for (const img of pendingImages) {
                  openaiMessages.push({
                    role: 'user',
                    type: 'message',
                    content: [{
                      type: 'input_image',
                      detail: 'high',
                      image_url: `data:${img.source.media_type};base64,${img.source.data}`,
                    }],
                  } as OpenAI.Responses.ResponseInputItem.Message);
                }
              }
              break;
            }

            default:
              // Handle unknown content types as text
              openaiMessages.push({
                role: 'user',
                type: 'message',
                content: [
                  {
                    type: 'input_text',
                    text: JSON.stringify(block),
                  },
                ],
              } as OpenAI.Responses.ResponseInputItem.Message);
          }
        }
      }
    }

    return openaiMessages;
  }

  private formatOpenAIResponse(
    response: OpenAI.Responses.ResponseOutputItem[],
  ): MessageContentBlock[] {
    const contentBlocks: MessageContentBlock[] = [];

    for (const item of response) {
      // Check the type of the output item
      switch (item.type) {
        case 'message':
          // Handle ResponseOutputMessage
          const message = item;
          for (const content of message.content) {
            if ('text' in content) {
              // ResponseOutputText
              contentBlocks.push({
                type: MessageContentType.Text,
                text: content.text,
              } as TextContentBlock);
            } else if ('refusal' in content) {
              // ResponseOutputRefusal
              contentBlocks.push({
                type: MessageContentType.Text,
                text: `Refusal: ${content.refusal}`,
              } as TextContentBlock);
            }
          }
          break;

        case 'function_call':
          // Handle ResponseFunctionToolCall
          const toolCall = item;
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(toolCall.arguments || '{}');
          } catch (e) {
            this.logger.error(
              `Failed to parse tool arguments for ${toolCall.name}: ${e.message}`,
              `Raw arguments: ${toolCall.arguments}`
            );
            // Add error block instead of crashing
            contentBlocks.push({
              type: MessageContentType.Text,
              text: `[ERROR] Failed to parse arguments for ${toolCall.name}: ${toolCall.arguments}`,
            } as TextContentBlock);
            break;
          }
          contentBlocks.push({
            type: MessageContentType.ToolUse,
            id: toolCall.call_id,
            name: toolCall.name,
            input: parsedArgs,
          } as ToolUseContentBlock);
          break;

        case 'file_search_call':
        case 'web_search_call':
        case 'computer_call':
        case 'reasoning':
          const reasoning = item as OpenAI.Responses.ResponseReasoningItem;
          if (reasoning.encrypted_content) {
            contentBlocks.push({
              type: MessageContentType.Thinking,
              thinking: reasoning.encrypted_content,
              signature: reasoning.id,
            } as ThinkingContentBlock);
          }
          break;
        case 'image_generation_call':
        case 'code_interpreter_call':
        case 'local_shell_call':
        case 'mcp_call':
        case 'mcp_list_tools':
        case 'mcp_approval_request':
          // Handle other tool types as text for now
          this.logger.warn(
            `Unsupported response output item type: ${item.type}`,
          );
          contentBlocks.push({
            type: MessageContentType.Text,
            text: JSON.stringify(item),
          } as TextContentBlock);
          break;

        default:
          // Handle unknown types
          this.logger.warn(
            `Unknown response output item type: ${JSON.stringify(item)}`,
          );
          contentBlocks.push({
            type: MessageContentType.Text,
            text: JSON.stringify(item),
          } as TextContentBlock);
      }
    }

    return contentBlocks;
  }

  /**
   * Ensure data URI prefix is present for base64 image data
   * OpenRouter/LiteLLM require data:image/...;base64, prefix
   */
  private ensureDataURIPrefix(base64Data: string): string {
    // If already has data URI prefix, return as-is
    if (base64Data.startsWith('data:image/')) {
      return base64Data;
    }
    // Add PNG data URI prefix (bytebotd sends raw PNG base64)
    return `data:image/png;base64,${base64Data}`;
  }

  /**
   * Convert Bytebot messages to Chat Completion format
   */
  private formatMessagesForChatCompletion(
    systemPrompt: string,
    messages: Message[],
  ): ChatCompletionMessageParam[] {
    const chatMessages: ChatCompletionMessageParam[] = [];

    // Add system message
    chatMessages.push({
      role: 'system',
      content: systemPrompt,
    });

    // Process each message
    for (const message of messages) {
      const messageContentBlocks = message.content as MessageContentBlock[];

      // Handle user actions specially
      if (
        messageContentBlocks.every((block) => isUserActionContentBlock(block))
      ) {
        const userActionBlocks = messageContentBlocks.flatMap(
          (block) => block.content,
        );

        for (const block of userActionBlocks) {
          if (isComputerToolUseContentBlock(block)) {
            chatMessages.push({
              role: 'user',
              content: `User performed action: ${block.name}\n${JSON.stringify(
                block.input,
                null,
                2,
              )}`,
            });
          } else if (isImageContentBlock(block)) {
            const cleanBase64 = block.source.data.replace(/\s/g, '');
            const dataUri = this.ensureDataURIPrefix(cleanBase64);
            chatMessages.push({
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUri,
                    detail: 'high',
                  },
                },
              ],
            });
          }
        }
      } else {
        // Group assistant messages into a single ChatCompletion message
        if (message.role === Role.ASSISTANT) {
          const textParts: string[] = [];
          const toolCalls: any[] = [];
          let reasoningContent: string | null = null;

          for (const block of messageContentBlocks) {
            switch (block.type) {
              case MessageContentType.Text:
                textParts.push((block as TextContentBlock).text);
                break;
              case MessageContentType.ToolUse: {
                const toolBlock = block as ToolUseContentBlock;
                toolCalls.push({
                  id: toolBlock.id,
                  type: 'function',
                  function: {
                    name: toolBlock.name,
                    arguments: JSON.stringify(toolBlock.input),
                  },
                });
                break;
              }
              case MessageContentType.Thinking:
                reasoningContent = (block as ThinkingContentBlock).thinking;
                break;
              default:
                // ignore other types in assistant message
                break;
            }
          }

          const assistantMsg: ChatCompletionMessageParam = {
            role: 'assistant',
            content: textParts.length ? textParts.join('\n') : (toolCalls.length > 0 ? null : ''),
          } as ChatCompletionMessageParam;
          if (toolCalls.length) (assistantMsg as any).tool_calls = toolCalls;
          if (reasoningContent) (assistantMsg as any).reasoning_content = reasoningContent;
          chatMessages.push(assistantMsg);
        } else {
          // Handle user messages normally, including tool results
          for (const block of messageContentBlocks) {
            switch (block.type) {
              case MessageContentType.Text:
                chatMessages.push({ role: 'user', content: (block as TextContentBlock).text });
                break;
              case MessageContentType.Image: {
                const imageBlock = block as ImageContentBlock;
                const cleanBase64 = imageBlock.source.data.replace(/\s/g, '');
                const dataUri = this.ensureDataURIPrefix(cleanBase64);
                chatMessages.push({
                  role: 'user',
                  content: [
                    {
                      type: 'image_url',
                      image_url: {
                        url: dataUri,
                        detail: 'high',
                      },
                    },
                  ],
                });
                break;
              }
              case MessageContentType.ToolResult: {
                const toolResultBlock = block as ToolResultContentBlock;
                let responded = false;
                const pendingImages: { media_type: string; data: string }[] = [];
                for (const content of toolResultBlock.content) {
                  if (content.type === MessageContentType.Text) {
                    chatMessages.push({
                      role: 'tool',
                      tool_call_id: toolResultBlock.tool_use_id,
                      content: content.text,
                    });
                    responded = true;
                  } else if (content.type === MessageContentType.Image) {
                    if (!responded) {
                      chatMessages.push({
                        role: 'tool',
                        tool_call_id: toolResultBlock.tool_use_id,
                        content: 'screenshot',
                      });
                      responded = true;
                    }
                    pendingImages.push({
                      media_type: content.source.media_type,
                      data: content.source.data,
                    });
                  }
                }
                // Send screenshots as separate user message
                if (pendingImages.length > 0) {
                  chatMessages.push({
                    role: 'user',
                    content: [
                      { type: 'text', text: 'Screenshot' },
                      ...pendingImages.map((img) => {
                        const cleanBase64 = img.data.replace(/\s/g, '');
                        const dataUri = this.ensureDataURIPrefix(cleanBase64);
                        return {
                          type: 'image_url',
                          image_url: {
                            url: dataUri,
                            detail: 'high',
                          },
                        } as ChatCompletionContentPart;
                      }),
                    ],
                  });
                }
                break;
              }
              default:
                // ignore
                break;
            }
          }
        }
      }
    }

    return chatMessages;
  }

  /**
   * Convert Chat Completion response to MessageContentBlocks
   */
  private formatChatCompletionResponse(
    message: OpenAI.Chat.ChatCompletionMessage,
  ): MessageContentBlock[] {
    const contentBlocks: MessageContentBlock[] = [];

    // Handle text content
    if (message.content) {
      contentBlocks.push({
        type: MessageContentType.Text,
        text: message.content,
      } as TextContentBlock);
    }

    // Handle reasoning content (for reasoning models)
    if (message['reasoning_content']) {
      contentBlocks.push({
        type: MessageContentType.Thinking,
        thinking: message['reasoning_content'],
        signature: message['reasoning_content'],
      } as ThinkingContentBlock);
    }

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === 'function') {
          let parsedInput = {};
          try {
            parsedInput = JSON.parse(toolCall.function.arguments || '{}');
          } catch (e) {
            this.logger.error(
              `Failed to parse tool arguments for ${toolCall.function.name}: ${e.message}`,
              `Raw arguments: ${toolCall.function.arguments}`
            );
            // Add error block instead of silent fallback
            contentBlocks.push({
              type: MessageContentType.Text,
              text: `[ERROR] Failed to parse arguments for ${toolCall.function.name}: ${toolCall.function.arguments}`,
            } as TextContentBlock);
            continue; // Skip this tool call
          }

          contentBlocks.push({
            type: MessageContentType.ToolUse,
            id: toolCall.id,
            name: toolCall.function.name,
            input: parsedInput,
          } as ToolUseContentBlock);
        }
      }
    }

    // Handle refusal
    if (message.refusal) {
      contentBlocks.push({
        type: MessageContentType.Text,
        text: `Refusal: ${message.refusal}`,
      } as TextContentBlock);
    }

    return contentBlocks;
  }
}
