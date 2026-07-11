/**
 * ChannelProvider — contrato agnostico ao provedor de canal (WhatsApp, etc).
 * Implementacoes concretas (ex.: EvolutionProvider) vivem em `*.server.ts`
 * e nunca sao importadas do bundle client.
 */

export type ChannelStatus =
  | "pending"
  | "qr"
  | "connecting"
  | "connected"
  | "disconnected"
  | "expired"
  | "error";

export interface QrPayload {
  /** QR code em base64 (data URL ou raw base64). */
  base64: string;
  /** Timestamp de expiracao aproximado, em ms epoch. */
  expiresAt?: number;
}

export interface StatusPayload {
  status: ChannelStatus;
  /** Mensagem opaca para UI; nunca inclui PII/stack. */
  detail?: string;
  lastSeenAt?: number;
}

export interface OutboundText {
  to: string;
  text: string;
}

export interface OutboundAudio {
  to: string;
  /** URL publica OU base64 do audio (implementacao decide). */
  audio: string;
  mimeType?: string;
}

export interface SendResult {
  providerMessageId: string;
}

export interface InboundMessage {
  providerMessageId: string;
  from: string;
  to: string;
  direction: "inbound" | "outbound";
  kind: "text" | "audio" | "image" | "video" | "document" | "other";
  text?: string;
  mediaUrl?: string;
  timestamp: number;
}

export interface WebhookResult {
  /** Eventos normalizados que o handler deve persistir em `messages`. */
  messages: InboundMessage[];
  /** Mudanca de status opcional para atualizar `connections.status`. */
  statusChange?: StatusPayload;
}

export interface CreateInstanceInput {
  /** Nome logico da instancia (unico por workspace). */
  name: string;
  /** ID interno da connection (para correlacionar webhooks). */
  connectionId: string;
  /** URL publica do webhook desta instalacao. */
  webhookUrl: string;
  /** Headers de autenticacao enviados pelo provedor ao chamar o webhook. */
  webhookHeaders?: Record<string, string>;
}

export interface CreateInstanceResult {
  /** ID/nome da instancia no provedor. */
  providerInstanceId: string;
  qr?: QrPayload;
  status: StatusPayload;
}

export interface ChannelProvider {
  readonly id: string;
  createInstance(input: CreateInstanceInput): Promise<CreateInstanceResult>;
  getQrCode(providerInstanceId: string): Promise<QrPayload>;
  getStatus(providerInstanceId: string): Promise<StatusPayload>;
  sendText(providerInstanceId: string, msg: OutboundText): Promise<SendResult>;
  sendAudio(providerInstanceId: string, msg: OutboundAudio): Promise<SendResult>;
  /** Presence "digitando" best-effort; nunca deve falhar o envio. */
  sendTyping?(providerInstanceId: string, to: string, durationMs: number): Promise<void>;
  /** Atualiza settings da instancia (ex.: groups_ignore). Best-effort. */
  setSettings?(providerInstanceId: string, settings: { groupsIgnore?: boolean }): Promise<void>;
  deleteInstance(providerInstanceId: string): Promise<void>;
  /**
   * Recebe payload bruto validado do webhook e normaliza para InboundMessage[].
   * Nao persiste; a rota publica cuida da persistencia.
   */
  handleWebhook(rawBody: unknown): Promise<WebhookResult>;
}
