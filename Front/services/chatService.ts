// services/chatService.ts
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface Conversation {
  id: number;
  senior_id: number;
  senior_name: string;
  doctor_user_id?: number;
  status: string;
  last_message?: {
    content: string;
    sent_at: string;
  };
  created_at: string;
  updated_at: string;
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
  senior_id: number;
  doctor_user_id?: number;
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
  private onMessage: (message: Message) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private shouldReconnect = true;
  private hasConnectedOnce = false;

  constructor(
    conversationId: number,
    onMessage: (message: Message) => void
  ) {
    this.conversationId = conversationId;
    this.onMessage = onMessage;
    
    // Validar que onMessage sea una función
    if (typeof this.onMessage !== 'function') {
      console.error('❌ onMessage no es una función:', typeof this.onMessage);
      throw new Error('onMessage debe ser una función');
    }
  }

  async connect() {
    try {
      // Validar nuevamente antes de conectar
      if (typeof this.onMessage !== 'function') {
        console.error('❌ onMessage no es una función al conectar:', typeof this.onMessage);
        return;
      }

      // Obtener el token real del usuario
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.error('❌ No hay token de acceso disponible');
        return;
      }

      // Obtener la URL base del API y convertirla a WebSocket
      const LOCAL_IP = '192.168.100.26'; // Debe coincidir con api.ts
      let wsUrl: string;
      
      if (Platform.OS === 'android') {
        wsUrl = `ws://${LOCAL_IP}:8000`;
      } else if (Platform.OS === 'ios') {
        wsUrl = 'ws://localhost:8000';
      } else {
        wsUrl = `ws://${LOCAL_IP}:8000`;
      }
      
      const fullWsUrl = `${wsUrl}/ws/conversations/${this.conversationId}?token=${token}`;
      
      console.log('🔌 Intentando conectar WebSocket:', fullWsUrl.replace(token, 'TOKEN_OCULTO'));
      this.ws = new WebSocket(fullWsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket conectado exitosamente');
        this.reconnectAttempts = 0;
        this.hasConnectedOnce = true;
      };

      this.ws.onmessage = (event) => {
        try {
          // Verificar que sea un objeto JSON válido
          if (typeof event.data !== 'string') {
            console.warn('⚠️ Mensaje WebSocket no es string:', typeof event.data);
            return;
          }

          const data = JSON.parse(event.data);
          
          // Verificar que sea un mensaje válido con el tipo correcto
          if (!data || typeof data !== 'object') {
            console.warn('⚠️ Datos WebSocket no son objeto:', data);
            return;
          }

          if (data.type === 'message' && data.content) {
            this.onMessage({
              id: data.id,
              conversation_id: data.conversation_id,
              sender_user_id: data.sender_user_id,
              content: data.content,
              sent_at: data.sent_at,
            });
          } else {
            // Puede ser un mensaje de sistema o conexión, ignorar silenciosamente
            console.log('📩 Mensaje WebSocket (no es chat):', data.type || 'sin tipo');
          }
        } catch (error) {
          // Solo logear si es un error real de parsing
          if (error instanceof SyntaxError) {
            console.warn('⚠️ Error parsing mensaje WebSocket:', event.data.substring(0, 100));
          } else {
            console.error('❌ Error procesando mensaje WebSocket:', error);
          }
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
    } catch (error) {
      console.error('Error al conectar WebSocket:', error);
    }
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
