// services/chatService.ts
import api from './api';

export interface Conversation {
  id: number;
  title?: string;
  created_at: string;
  updated_at: string;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_user_id: number;
  sender_name?: string;
  content: string;
  sent_at: string;
  read_at?: string;
}

export interface ConversationCreate {
  title?: string;
  participant_user_ids: number[];
}

export interface MessageCreate {
  content: string;
}

class ChatService {
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await api.get<Conversation[]>('/chat/conversations');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo conversaciones:', error);
      return [];
    }
  }

  async createConversation(data: ConversationCreate): Promise<Conversation | null> {
    try {
      const response = await api.post<Conversation>('/chat/conversations', data);
      return response.data;
    } catch (error) {
      console.error('Error creando conversación:', error);
      return null;
    }
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    try {
      const response = await api.get<Message[]>(`/chat/conversations/${conversationId}/messages`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      return [];
    }
  }

  async sendMessage(conversationId: number, content: string): Promise<Message | null> {
    try {
      const response = await api.post<Message>(`/chat/conversations/${conversationId}/messages`, { content });
      return response.data;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      return null;
    }
  }
}

export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private conversationId: number;
  private token: string;
  private onMessage: (message: Message) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private shouldReconnect = true;
  private hasConnectedOnce = false;

  constructor(
    conversationId: number,
    token: string,
    onMessage: (message: Message) => void
  ) {
    this.conversationId = conversationId;
    this.token = token;
    this.onMessage = onMessage;
  }

  connect() {
    // Obtener la URL base del API y convertirla a WebSocket
    const apiUrl = 'http://192.168.100.43:8000'; // Misma IP que la API REST
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const fullWsUrl = `${wsUrl}/ws/conversations/${this.conversationId}?token=${this.token}`;
    
    console.log('🔌 Intentando conectar WebSocket:', fullWsUrl);
    this.ws = new WebSocket(fullWsUrl);

    this.ws.onopen = () => {
      console.log('✅ WebSocket conectado exitosamente');
      this.reconnectAttempts = 0;
      this.hasConnectedOnce = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          this.onMessage({
            id: data.id,
            conversation_id: data.conversation_id,
            sender_user_id: data.sender_user_id,
            content: data.content,
            sent_at: data.sent_at,
          });
        }
      } catch (error) {
        console.error('Error procesando mensaje WebSocket:', error);
      }
    };

    this.ws.onerror = (error) => {
      // Solo mostrar advertencia si nunca se conectó (servidor no disponible)
      if (!this.hasConnectedOnce && this.reconnectAttempts === 0) {
        console.warn('⚠️ No se pudo conectar al chat. El servidor WebSocket no está disponible.');
      }
    };

    this.ws.onclose = () => {
      // Solo reintentar si ya se había conectado anteriormente (desconexión inesperada)
      // No reintentar si nunca se conectó (servidor no disponible)
      if (this.hasConnectedOnce && this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          console.log(`🔄 Reintentando conexión WebSocket... Intento ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          this.connect();
        }, 3000 * this.reconnectAttempts);
      } else if (!this.hasConnectedOnce && this.reconnectAttempts === 0) {
        console.log('ℹ️ Chat no disponible. Necesitas iniciar el servidor backend para usar esta función.');
      }
    };
  }

  sendMessage(content: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ content }));
    } else {
      console.error('WebSocket no está conectado');
    }
  }

  disconnect() {
    this.shouldReconnect = false; // Evitar reconexión automática
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default new ChatService();
