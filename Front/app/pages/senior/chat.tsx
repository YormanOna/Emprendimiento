// app/pages/senior/chat.tsx
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import chatService, { Message, ChatWebSocket, Conversation } from '@/services/chatService';
import authService, { User } from '@/services/authService';

export default function ChatScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const wsRef = useRef<ChatWebSocket | null>(null);
  const isInitialized = useRef(false);

  // Auto-refresh al volver a la página
  useFocusEffect(
    React.useCallback(() => {
      if (!isInitialized.current) {
        isInitialized.current = true;
        initChat();
      }
      
      return () => {
        // Solo desconectar cuando realmente se desmonta el componente
        if (wsRef.current) {
          wsRef.current.disconnect();
          wsRef.current = null;
        }
        isInitialized.current = false;
      };
    }, [])
  );

  const initChat = async () => {
    try {
      setLoading(true);
      
      // Obtener usuario actual
      const userData = await authService.getCurrentUser();
      setUser(userData);

      if (!userData?.senior_id) {
        console.error('Usuario no tiene senior_id asociado');
        setLoading(false);
        return;
      }

      // Obtener o crear conversación para este senior
      const conversations = await chatService.getConversations();
      let conv = conversations.find(c => c.senior_id === userData.senior_id);

      if (!conv) {
        // Crear nueva conversación
        const newConv = await chatService.createConversation({ senior_id: userData.senior_id });
        if (newConv) {
          conv = newConv;
        }
      }

      if (conv) {
        setConversation(conv);
        await loadMessages(conv.id);
        connectWebSocket(conv.id);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error inicializando chat:', error);
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    const data = await chatService.getMessages(conversationId);
    setMessages(data);
    setTimeout(() => scrollToBottom(), 100);
  };

  const connectWebSocket = async (conversationId: number) => {
    try {
      // Desconectar WebSocket anterior si existe
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }

      wsRef.current = new ChatWebSocket(
        conversationId,
        (newMessage: Message) => {
          // Evitar duplicados: solo agregar si no existe
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) {
              console.log('⚠️ Mensaje duplicado ignorado:', newMessage.id);
              return prev;
            }
            return [...prev, newMessage];
          });
          setTimeout(() => scrollToBottom(), 100);
        }
      );
      
      await wsRef.current.connect();
    } catch (error) {
      console.error('Error conectando WebSocket:', error);
    }
  };
  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !conversation) return;

    // Si el WebSocket está conectado, usarlo; sino, usar HTTP
    if (wsRef.current && wsRef.current.sendMessage) {
      try {
        wsRef.current.sendMessage(trimmed);
      } catch (error) {
        console.warn('WebSocket falló, usando HTTP...');
        await sendViaHttp(trimmed);
      }
    } else {
      await sendViaHttp(trimmed);
    }
    
    setInputText('');
  };

  const sendViaHttp = async (content: string) => {
    if (!conversation) return;
    
    const newMsg = await chatService.sendMessage(conversation.id, content);
    if (newMsg) {
      // Evitar duplicados: solo agregar si no existe
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === newMsg.id);
        if (exists) {
          console.log('⚠️ Mensaje HTTP duplicado ignorado:', newMsg.id);
          return prev;
        }
        return [...prev, newMsg];
      });
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Cargando chat...</Text>
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
        <Text style={styles.errorText}>No se pudo cargar el chat</Text>
        <Text style={styles.errorSubtext}>Intenta recargar la aplicación</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat de Cuidado</Text>
          <Text style={styles.subtitle}>Conversa con tu equipo médico</Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollToBottom()}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No hay mensajes aún</Text>
              <Text style={styles.emptySubtext}>Inicia la conversación con tu equipo</Text>
            </View>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.sender_user_id === user?.id;
              return (
                <View
                  key={`${msg.id}-${index}`}
                  style={[
                    styles.messageBubble,
                    isMe ? styles.myMessage : styles.theirMessage,
                  ]}
                >
                  {!isMe && msg.sender_name && (
                    <Text style={styles.senderName}>{msg.sender_name}</Text>
                  )}
                  <Text style={isMe ? styles.myMessageText : styles.theirMessageText}>
                    {msg.content}
                  </Text>
                  <Text style={styles.messageTime}>
                    {new Date(msg.sent_at).toLocaleTimeString('es-EC', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      timeZone: 'America/Guayaquil'
                    })}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#8b5cf6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#ede9fe',
    marginTop: 4,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#8b5cf6',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  myMessageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },
  theirMessageText: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
});
