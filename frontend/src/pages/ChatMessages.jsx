import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast.jsx';
import { ArrowLeft, Send, Sparkles, X, User } from 'lucide-react';
import Loading from '../components/Loading';

export default function ChatMessages() {
  const { chatId, sessionId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [chatInfo, setChatInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [displayedMessages, setDisplayedMessages] = useState({});
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingIntervalsRef = useRef({});
  const targetMessagesRef = useRef({}); // Track target text for each message
  const { toast } = useToast();
  
  // Suggested prompts
  const suggestedPrompts = [
    "What's the main topic of this dataset?",
    "What are the key findings?",
    "Can you summarize the content?",
  ];
  
  // Get API URL from environment or use default
  const getApiUrl = () => {
    return 'http://localhost:5000';
  };

  useEffect(() => {
    fetchSessionDetails();
    fetchChatInfo();
  }, [chatId, sessionId]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change, but only if user is near bottom
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages, displayedMessages]);

  // Auto-scroll on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [loading]);

  // Cleanup typing intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(typingIntervalsRef.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const fetchChatInfo = async () => {
    try {
      const response = await api.get('/ragflow/chats', {
        params: { id: chatId }
      });
      if (response.data.success && response.data.chats && response.data.chats.length > 0) {
        setChatInfo(response.data.chats[0]);
      }
    } catch (error) {
      console.error('Failed to fetch chat info:', error);
    }
  };

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/ragflow/chats/${chatId}/sessions`, {
        params: { id: sessionId }
      });
      if (response.data.success && response.data.sessions && response.data.sessions.length > 0) {
        const session = response.data.sessions[0];
        setSessionInfo(session);
        // Only set messages if we don't have any yet, or if we're refreshing
        if (messages.length === 0) {
          setMessages(session.messages || []);
          // Reset displayed messages for loaded messages
          const loadedMessages = session.messages || [];
          const newDisplayed = {};
          loadedMessages.forEach(msg => {
            if (msg.id || msg.content) {
              newDisplayed[msg.id || `msg-${loadedMessages.indexOf(msg)}`] = msg.content || '';
            }
          });
          setDisplayedMessages(newDisplayed);
        }
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to fetch session details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to fetch session details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (question = null) => {
    const messageText = question || newMessage.trim();

    if (!messageText || sending) {
      return;
    }

    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setSending(true);
    
    // Scroll to bottom when user sends message
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    // Initialize assistant message
    let assistantMessageId = `msg-${Date.now()}`;
    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      reference: null,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      // Use fetch for streaming with custom headers
      const response = await fetch(
        `${getApiUrl()}/api/ragflow/chats/${chatId}/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            question: messageText,
            session_id: sessionId,
            stream: true
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send message');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedAnswer = '';
      let finalReference = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === 'true') continue;

            try {
              const data = JSON.parse(jsonStr);
              
              if (data.code === 0 && data.data) {
                if (data.data === true) {
                  // End of stream
                  continue;
                }

                if (data.data.answer) {
                  accumulatedAnswer = data.data.answer;
                  if (data.data.reference) {
                    finalReference = data.data.reference;
                  }
                  
                  // Update the message content
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId
                      ? { 
                          ...msg, 
                          content: accumulatedAnswer, 
                          reference: finalReference,
                          timestamp: new Date().toISOString()
                        }
                      : msg
                  ));
                  
                  // Update typing effect - this will queue new text if already typing
                  typeMessage(assistantMessageId, accumulatedAnswer);
                  
                  // Auto-scroll to bottom while streaming (only if near bottom)
                  const container = messagesContainerRef.current;
                  if (container) {
                    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
                    if (isNearBottom) {
                      setTimeout(() => {
                        scrollToBottom();
                      }, 50);
                    }
                  }
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      setSending(false);
      
      // Ensure full message is displayed after streaming completes
      // The typing effect will continue until all text is shown
      if (accumulatedAnswer && targetMessagesRef.current[assistantMessageId]) {
        // Let typing effect complete naturally
        // If it's already done, just set the final text
        const currentDisplayed = displayedMessages[assistantMessageId] || '';
        if (currentDisplayed.length >= accumulatedAnswer.length) {
          // Already fully displayed
        } else {
          // Typing is still in progress, will complete automatically
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setSending(false);
      
      // Remove the empty assistant message on error
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleSuggestedPrompt = (prompt) => {
    handleSendMessage(prompt);
  };

  const typeMessage = (messageId, fullText) => {
    // Update target text (what we eventually want to display)
    targetMessagesRef.current[messageId] = fullText;
    
    // Get current displayed text
    const currentDisplayed = displayedMessages[messageId] || '';
    
    // If already displayed everything, no need to type
    if (currentDisplayed.length >= fullText.length) {
      return;
    }

    // If there's already a typing interval running, don't start a new one
    // The existing one will continue typing until it catches up
    if (typingIntervalsRef.current[messageId]) {
      return;
    }

    // Start typing from where we left off
    let currentIndex = currentDisplayed.length;
    const typingSpeed = 20; // milliseconds per character

    typingIntervalsRef.current[messageId] = setInterval(() => {
      const targetText = targetMessagesRef.current[messageId] || '';
      
      if (currentIndex < targetText.length) {
        currentIndex++;
        const newDisplayed = targetText.substring(0, currentIndex);
        setDisplayedMessages(prev => ({
          ...prev,
          [messageId]: newDisplayed
        }));
      } else {
        // Check if there's more text to type (stream added more)
        if (currentIndex >= targetText.length) {
          // Typing complete for current target
          // Clear interval - it will restart if new text arrives
          if (typingIntervalsRef.current[messageId]) {
            clearInterval(typingIntervalsRef.current[messageId]);
            delete typingIntervalsRef.current[messageId];
            
            // If there's more text in target, restart typing
            const latestTarget = targetMessagesRef.current[messageId] || '';
            if (latestTarget.length > currentIndex) {
              // Restart typing with new content
              setTimeout(() => {
                typeMessage(messageId, latestTarget);
              }, 50);
            }
          }
        }
      }
    }, typingSpeed);
  };

  const formatMessageContent = (content) => {
    if (!content) return '';
    
    // Replace [ID:X] with styled references
    const parts = content.split(/(\[ID:\d+\])/g);
    return parts.map((part, index) => {
      if (part.match(/\[ID:\d+\]/)) {
        return (
          <span key={index} className="inline-block px-2 py-0.5 mx-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-semibold">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (loading) {
    return <Loading />;
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(`/ragflow/chats/${chatId}/sessions`)}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">AI Assist</h1>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {chatInfo?.name || sessionInfo?.name || 'Chat Assistant'}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6"
        style={{ scrollBehavior: 'auto' }}
      >
        {!hasMessages ? (
          /* Initial State - Empty */
          <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-full">
            {/* Large Icon */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
            </div>
            
            {/* Prompt Text */}
            <h2 className="text-xl font-medium text-gray-700 mb-8">
              Ask anything about the knowledge base
            </h2>
            
            {/* Suggested Prompts */}
            <div className="w-full space-y-3 mb-8">
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="w-full text-left px-4 py-3 bg-white rounded-full border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-gray-700 font-medium shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Conversation State */
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message, index) => {
              const isEmptyAssistant = message.role === 'assistant' && !message.content && sending && index === messages.length - 1;
              const isStreamingAssistant = message.role === 'assistant' && message.content && sending && index === messages.length - 1;
              
              // Get displayed text for typing effect (only for streaming assistant messages)
              const displayContent = isStreamingAssistant 
                ? (displayedMessages[message.id] || message.content.substring(0, Math.min(50, message.content.length)))
                : message.content;
              
              return (
                <div
                  key={message.id || index}
                  className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-gray-200' 
                      : 'bg-gradient-to-br from-blue-500 to-purple-500'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-gray-600" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-white" />
                    )}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={`flex-1 max-w-[75%] ${
                    message.role === 'user' ? 'items-end' : 'items-start'
                  } flex flex-col`}>
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-purple-50 text-gray-900 border border-purple-100'
                      }`}
                    >
                      {isEmptyAssistant ? (
                        /* Loading animation inside message bubble */
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {formatMessageContent(displayContent)}
                          {isStreamingAssistant && displayContent.length < message.content.length && (
                            <span className="inline-block w-2 h-4 bg-gray-500 ml-1 animate-pulse">|</span>
                          )}
                        </div>
                      )}
                    </div>
                  
                  {/* References */}
                  {message.reference && message.reference.chunks && message.reference.chunks.length > 0 && (
                    <div className="mt-2 w-full">
                      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center space-x-2 mb-2">
                          <Sparkles className="h-3 w-3 text-gray-500" />
                          <span className="text-xs font-semibold text-gray-700">References</span>
                        </div>
                        <div className="space-y-2">
                          {message.reference.chunks.slice(0, 3).map((chunk, idx) => (
                            <div key={idx} className="text-xs bg-gray-50 rounded p-2 border border-gray-100">
                              <div className="font-medium text-gray-700 mb-1">
                                {chunk.document_name || 'Document'}
                              </div>
                              <div className="text-gray-600 line-clamp-2">
                                {chunk.content?.substring(0, 100)}...
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
            })}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4 shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ask me anything"
                className="w-full rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-4 py-3 pr-12"
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 p-0"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
