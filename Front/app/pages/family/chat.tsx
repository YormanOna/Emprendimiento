// app/pages/family/chat.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
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

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    if (wsRef.current) {
      wsRef.current.sendMessage(trimmed);
      setInputText('');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CHAT</Text>
        <Text style={styles.subtitle}>FAMILIA</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollToBottom()}
      >
        {messages.map((msg) => {
          const isMe = msg.sender_user_id === currentUserId;
          return (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                isMe ? styles.myMessage : styles.theirMessage,
              ]}
            >
              <Text style={isMe ? styles.myMessageText : styles.theirMessageText}>
                {msg.content}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <View style={styles.sendButtonInner} />
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>© 2023 Application</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#fbcfe8',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
  },
  myMessageText: {
    color: '#9f1239',
    fontSize: 15,
  },
  theirMessageText: {
    color: '#374151',
    fontSize: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonInner: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftColor: '#fff',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 2,
  },
  footer: {
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 12,
    color: '#9ca3af',
    backgroundColor: '#fff',
  },
});
