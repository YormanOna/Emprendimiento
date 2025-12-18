// app/pages/family/chat.tsx
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
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import chatService, { Message, ChatWebSocket } from '@/services/chatService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatScreen() {
  const conversationId = 1;
  const currentUserId = 4; // ID de familia
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const wsRef = useRef<ChatWebSocket | null>(null);

  useEffect(() => {
    loadInitialMessages();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, []);

  const loadInitialMessages = async () => {
    const data = await chatService.getMessages(conversationId);
    setMessages(data);
    setTimeout(() => scrollToBottom(), 100);
  };

  const connectWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token') || 'fake-token-for-dev';
      
      wsRef.current = new ChatWebSocket(
        conversationId,
        token,
        (newMessage: Message) => {
          setMessages(prev => [...prev, newMessage]);
          setTimeout(() => scrollToBottom(), 100);
        }
      );
      
      wsRef.current.connect();
    } catch (error) {
      console.error('Error conectando WebSocket:', error);
    }
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Si el WebSocket no está conectado, intentar enviar por HTTP
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
    const newMsg = await chatService.sendMessage(conversationId, content);
    if (newMsg) {
      setMessages(prev => [...prev, newMsg]);
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat</Text>
          <Text style={styles.subtitle}>Conversación con el equipo médico</Text>
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
              <Text style={styles.emptySubtext}>Inicia la conversación</Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_user_id === currentUserId;
              return (
                <View
                  key={msg.id}
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
                    {new Date(msg.sent_at).toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
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
  header: {
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ec4899',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fce7f3',
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
    backgroundColor: '#ec4899',
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
    backgroundColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
});
