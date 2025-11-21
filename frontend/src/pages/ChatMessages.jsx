import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast.jsx';
import { ArrowLeft, Send, Sparkles, X, User, GraduationCap, UserCircle, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import Loading from '../components/Loading';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

export default function ChatMessages() {
          const { chatId, sessionId } = useParams();
          const navigate = useNavigate();
          const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [chatInfo, setChatInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [displayedMessages, setDisplayedMessages] = useState({});
  const [evaluation, setEvaluation] = useState(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
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
    fetchEvaluation();
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

  const fetchEvaluation = async () => {
    try {
      const response = await api.get(`/chats/${chatId}/sessions/${sessionId}/evaluation`);
      if (response.data.success) {
        setEvaluation(response.data.evaluation);
      }
    } catch (error) {
      console.error('Failed to fetch evaluation:', error);
    }
  };

  const handleGenerateEvaluation = async () => {
    // If evaluation exists, show it in dialog
    if (evaluation) {
      setEvaluationDialogOpen(true);
      return;
    }
    
    // Otherwise generate new evaluation
    try {
      setEvaluationLoading(true);
      const response = await api.post(`/chats/${chatId}/sessions/${sessionId}/evaluate`);
      if (response.data.success) {
        setEvaluation(response.data.evaluation);
        setEvaluationDialogOpen(true);
        toast({
          title: 'Success',
          description: 'Evaluation report generated successfully!',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to generate evaluation',
        variant: 'destructive',
      });
    } finally {
      setEvaluationLoading(false);
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
          // Parse and store character for each loaded message, and clean content
          const loadedMessages = (session.messages || []).map(msg => {
            if (msg.role === 'assistant' && msg.content) {
              const { character, cleanedContent } = parseMessageContent(msg.content);
              return { ...msg, character, content: cleanedContent };
            }
            return msg;
          });
          setMessages(loadedMessages);
          // Reset displayed messages for loaded messages
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
      const errorMessage = error.response?.data?.error || 'Failed to fetch session details';
      // Check if chat doesn't exist
      if (error.response?.status === 400 && (errorMessage.includes("doesn't exist") || errorMessage.includes("not found") || errorMessage.includes("not have access"))) {
        toast({
          title: 'Chat Assistant Unavailable',
          description: 'This chat assistant is no longer available. This session is no longer accessible.',
          variant: 'destructive',
        });
        // Navigate back based on user role
        setTimeout(() => {
          if (user?.role === 'student') {
            navigate('/student/chats');
          } else {
            navigate(`/ragflow/chats/${chatId}/sessions`);
          }
        }, 2000);
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        if (user?.role === 'student') {
          navigate('/student/chats');
        } else {
          navigate(`/ragflow/chats/${chatId}/sessions`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (question = null) => {
    // Prevent sending messages if evaluation report already exists
    if (evaluation) {
      toast({
        title: 'Evaluation Already Generated',
        description: 'You cannot send new messages after an evaluation report has been generated for this session.',
        variant: 'destructive',
      });
      return;
    }

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
      character: 'Patient', // Default character, will be updated when streaming starts
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
                  
                  // Parse character from accumulated answer before cleaning
                  const { character, cleanedContent } = parseMessageContent(accumulatedAnswer);
                  
                  // Update the message content with cleaned content and store character
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId
                      ? { 
                          ...msg, 
                          content: cleanedContent, 
                          character: character, // Store character separately
                          reference: finalReference,
                          timestamp: new Date().toISOString()
                        }
                      : msg
                  ));
                  
                  // Update typing effect with cleaned content - this will queue new text if already typing
                  typeMessage(assistantMessageId, cleanedContent);
                  
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
        // Clean the accumulated answer
        const { cleanedContent } = parseMessageContent(accumulatedAnswer);
        
        // Let typing effect complete naturally
        // If it's already done, just set the final text
        const currentDisplayed = displayedMessages[assistantMessageId] || '';
        const { cleanedContent: currentCleaned } = parseMessageContent(currentDisplayed);
        
        if (currentCleaned.length >= cleanedContent.length) {
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
    // Clean the text first to remove character markers before storing
    const { cleanedContent } = parseMessageContent(fullText);
    
    // Update target text (what we eventually want to display) - use cleaned content
    targetMessagesRef.current[messageId] = cleanedContent;
    
    // Get current displayed text and clean it
    const currentDisplayed = displayedMessages[messageId] || '';
    const { cleanedContent: currentCleaned } = parseMessageContent(currentDisplayed);
    
    // If already displayed everything, no need to type
    if (currentCleaned.length >= cleanedContent.length) {
      return;
    }

    // If there's already a typing interval running, don't start a new one
    // The existing one will continue typing until it catches up
    if (typingIntervalsRef.current[messageId]) {
      return;
    }

    // Start typing from where we left off (using cleaned content)
    let currentIndex = currentCleaned.length;
    const typingSpeed = 20; // milliseconds per character

    typingIntervalsRef.current[messageId] = setInterval(() => {
      const targetText = targetMessagesRef.current[messageId] || '';
      
      if (currentIndex < targetText.length) {
        currentIndex++;
        const newDisplayed = targetText.substring(0, currentIndex);
        // Clean the displayed text to ensure no partial markers are shown
        const { cleanedContent: newCleaned } = parseMessageContent(newDisplayed);
        setDisplayedMessages(prev => ({
          ...prev,
          [messageId]: newCleaned
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
              // Restart typing with new content (already cleaned)
              setTimeout(() => {
                typeMessage(messageId, latestTarget);
              }, 50);
            }
          }
        }
      }
    }, typingSpeed);
  };

  // Helper function to detect character and clean content
  const parseMessageContent = (content) => {
    if (!content) return { character: 'Patient', cleanedContent: '' };
    
    // Remove [ID:X] patterns first
    let cleanedContent = content.replace(/\[ID:\d+\]/g, '');
    
    // Detect character marker like [character: Patient] or [character: Instructor]
    // Also handle partial markers during streaming like [character:, [character: P, etc.
    const characterMatch = cleanedContent.match(/\[character:\s*(\w+)\]/i);
    let character = 'Patient'; // Default character
    
    if (characterMatch) {
      character = characterMatch[1];
      // Remove the complete character marker from content
      cleanedContent = cleanedContent.replace(/\[character:\s*\w+\]/gi, '').trim();
    } else {
      // Check for partial character marker during streaming and remove it
      // This handles cases like "[character:", "[character: P", "[character: Pat", etc.
      cleanedContent = cleanedContent.replace(/\[character:[^\]]*\]?/gi, '').trim();
    }
    
    return { character, cleanedContent };
  };

  // Get styling based on character
  const getCharacterStyle = (character) => {
    const charLower = character.toLowerCase();
    
    if (charLower === 'instructor') {
      return {
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-900',
        avatarBg: 'bg-green-100',
        avatarIcon: GraduationCap,
        avatarColor: 'text-green-600'
      };
    } else if (charLower === 'patient') {
      return {
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-100',
        textColor: 'text-gray-900',
        avatarBg: 'bg-purple-100',
        avatarIcon: Sparkles,
        avatarColor: 'text-purple-600'
      };
    } else {
      // Other characters - use blue theme
      return {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-900',
        avatarBg: 'bg-blue-100',
        avatarIcon: UserCircle,
        avatarColor: 'text-blue-600'
      };
    }
  };

  const formatMessageContent = (content) => {
    const { cleanedContent } = parseMessageContent(content);
    return cleanedContent;
  };

  if (loading) {
    return <Loading />;
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50 w-full fixed inset-0 left-0 right-0 top-0 bottom-0" style={{ zIndex: 10 }}>
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
            <h1 className="text-lg font-semibold text-gray-900">
              {sessionInfo?.name 
                ? (sessionInfo.name.length > 20 
                    ? sessionInfo.name.substring(0, 20) + '...' 
                    : sessionInfo.name)
                : chatInfo?.name || 'Chat Assistant'}
            </h1>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateEvaluation}
              disabled={evaluationLoading}
            >
              {evaluationLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : evaluation ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  View Evaluation
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Evaluation
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 w-full"
        style={{ scrollBehavior: 'auto' }}
      >
        {!hasMessages ? (
          /* Initial State - Empty */
          <div className="w-full max-w-full px-4 flex flex-col items-center justify-center h-full">
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
          <div className="w-full max-w-full px-4 space-y-6">
            {messages.map((message, index) => {
              const isEmptyAssistant = message.role === 'assistant' && !message.content && sending && index === messages.length - 1;
              const isStreamingAssistant = message.role === 'assistant' && message.content && sending && index === messages.length - 1;
              
              // Get displayed text for typing effect (only for streaming assistant messages)
              let displayContent = isStreamingAssistant 
                ? (displayedMessages[message.id] || message.content.substring(0, Math.min(50, message.content.length)))
                : message.content;
              
              // For assistant messages, get character from stored message or parse from content
              let parsedContent = displayContent;
              let character = 'Patient';
              
              if (message.role === 'assistant') {
                // First try to use stored character (from message.character)
                if (message.character) {
                  character = message.character;
                  parsedContent = displayContent; // Content is already cleaned
                } else {
                  // Fallback: parse from content (for backward compatibility or during streaming)
                  const parsed = parseMessageContent(displayContent);
                  character = parsed.character;
                  parsedContent = parsed.cleanedContent;
                }
              }
              
              // Get character styling for assistant messages
              const characterStyle = message.role === 'assistant' ? getCharacterStyle(character) : null;
              const AvatarIcon = characterStyle?.avatarIcon || Sparkles;
              
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
                      : characterStyle?.avatarBg || 'bg-purple-100'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-gray-600" />
                    ) : (
                      <AvatarIcon className={`h-4 w-4 ${characterStyle?.avatarColor || 'text-purple-600'}`} />
                    )}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={`flex-1 max-w-[85%] ${
                    message.role === 'user' ? 'items-end' : 'items-start'
                  } flex flex-col`}>
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gray-100 text-gray-900'
                          : `${characterStyle?.bgColor || 'bg-purple-50'} ${characterStyle?.textColor || 'text-gray-900'} border ${characterStyle?.borderColor || 'border-purple-100'}`
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
                          {message.role === 'assistant' ? parsedContent : formatMessageContent(displayContent)}
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
        
        {/* Evaluation Report Section */}
        {evaluation && (
          <div className="w-full max-w-full px-4 mt-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Evaluation Report
                </h2>
                {(() => {
                  const score = evaluation.overall_score;
                  let colorClass = '';
                  if (score < 50) {
                    colorClass = 'text-red-600';
                  } else if (score >= 50 && score < 60) {
                    colorClass = 'text-orange-600';
                  } else if (score >= 60 && score < 75) {
                    colorClass = 'text-yellow-600';
                  } else {
                    colorClass = 'text-green-600';
                  }
                  return (
                    <div className={`text-2xl font-bold ${colorClass}`}>
                      {score}/100
                    </div>
                  );
                })()}
              </div>
              
              {/* Category Scores */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {Object.entries(evaluation.category_scores || {}).map(([category, score]) => {
                  // Calculate percentage for category score (score is out of 20, so * 5 to get percentage)
                  const percentage = (score / 20) * 100;
                  let colorClass = '';
                  if (percentage < 50) {
                    colorClass = 'text-red-600';
                  } else if (percentage >= 50 && percentage < 60) {
                    colorClass = 'text-orange-600';
                  } else if (percentage >= 60 && percentage < 75) {
                    colorClass = 'text-yellow-600';
                  } else {
                    colorClass = 'text-green-600';
                  }
                  return (
                    <div key={category} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1 capitalize">
                        {category.replace('_', ' ')}
                      </div>
                      <div className={`text-lg font-semibold ${colorClass}`}>{score}/20</div>
                    </div>
                  );
                })}
              </div>
              
              {/* Strengths */}
              {evaluation.strengths && evaluation.strengths.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-green-700 mb-2">Strengths</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {evaluation.strengths.map((strength, idx) => (
                      <li key={idx} className="text-gray-700">{strength}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Weaknesses */}
              {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-red-700 mb-2">Weaknesses</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {evaluation.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-gray-700">{weakness}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Recommendations */}
              {evaluation.recommendations && evaluation.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-blue-700 mb-2">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {evaluation.recommendations.map((recommendation, idx) => (
                      <li key={idx} className="text-gray-700">{recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Evaluation Dialog */}
      {evaluation && (
        <Dialog open={evaluationDialogOpen} onOpenChange={setEvaluationDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Evaluation Report
                </span>
                {(() => {
                  const score = evaluation.overall_score;
                  let colorClass = '';
                  if (score < 50) {
                    colorClass = 'text-red-600';
                  } else if (score >= 50 && score < 60) {
                    colorClass = 'text-orange-600';
                  } else if (score >= 60 && score < 75) {
                    colorClass = 'text-yellow-600';
                  } else {
                    colorClass = 'text-green-600';
                  }
                  return (
                    <div className={`text-2xl font-bold ${colorClass}`}>
                      {score}/100
                    </div>
                  );
                })()}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Category Scores */}
              <div>
                <h3 className="font-semibold mb-3">Category Scores</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(evaluation.category_scores || {}).map(([category, score]) => {
                    // Calculate percentage for category score (score is out of 20, so * 5 to get percentage)
                    const percentage = (score / 20) * 100;
                    let colorClass = '';
                    if (percentage < 50) {
                      colorClass = 'text-red-600';
                    } else if (percentage >= 50 && percentage < 60) {
                      colorClass = 'text-orange-600';
                    } else if (percentage >= 60 && percentage < 75) {
                      colorClass = 'text-yellow-600';
                    } else {
                      colorClass = 'text-green-600';
                    }
                    return (
                      <div key={category} className="text-center p-4 bg-gray-50 rounded-lg border">
                        <div className="text-xs text-gray-600 mb-2 capitalize">
                          {category.replace('_', ' ')}
                        </div>
                        <div className={`text-2xl font-bold ${colorClass}`}>{score}/20</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Strengths */}
              {evaluation.strengths && evaluation.strengths.length > 0 && (
                <div>
                  <h3 className="font-semibold text-green-700 mb-2">Strengths</h3>
                  <ul className="list-disc list-inside space-y-1 pl-4">
                    {evaluation.strengths.map((strength, idx) => (
                      <li key={idx} className="text-gray-700">{strength}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Weaknesses */}
              {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-700 mb-2">Weaknesses</h3>
                  <ul className="list-disc list-inside space-y-1 pl-4">
                    {evaluation.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-gray-700">{weakness}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Recommendations */}
              {evaluation.recommendations && evaluation.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-blue-700 mb-2">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1 pl-4">
                    {evaluation.recommendations.map((recommendation, idx) => (
                      <li key={idx} className="text-gray-700">{recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Input Area */}
      <div className="border-t bg-white p-4 shadow-lg">
        {evaluation ? (
          <div className="w-full max-w-full px-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">Evaluation report has been generated.</span> No new messages can be sent to this session.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full max-w-full px-4">
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
        )}
      </div>
    </div>
  );
}
