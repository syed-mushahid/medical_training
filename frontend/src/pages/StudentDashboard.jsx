import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useToast } from '../components/ui/use-toast.jsx';
import api from '../lib/api';
import { MessageCircle, Plus, History } from 'lucide-react';
import Loading from '../components/Loading';
import { useTranslation } from 'react-i18next';
import { Badge } from '../components/ui/badge';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignedChats, setAssignedChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [allSessions, setAllSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [newConversationDialogOpen, setNewConversationDialogOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchAssignedChats();
    fetchAllSessions();
  }, []);

  const fetchAssignedChats = async () => {
    try {
      setChatsLoading(true);
      const response = await api.get('/student/assigned-chats');
      console.log('Assigned chats response:', response.data);
      if (response.data.success) {
        let chats = response.data.chats || [];
        
        // If chats array is empty but we have chat_ids, try to fetch chat details
        if (chats.length === 0 && response.data.chat_ids && response.data.chat_ids.length > 0) {
          console.log('Chats array is empty, but we have chat_ids:', response.data.chat_ids);
          // Try to fetch chats individually
          const fetchedChats = [];
          for (const chatId of response.data.chat_ids) {
            try {
              const chatResponse = await api.get('/ragflow/chats', {
                params: { id: chatId }
              });
              if (chatResponse.data.success && chatResponse.data.chats && chatResponse.data.chats.length > 0) {
                fetchedChats.push(chatResponse.data.chats[0]);
              }
            } catch (error) {
              // Chat doesn't exist in RAGFlow, skip it
              console.error(`Failed to fetch chat ${chatId}:`, error);
              // Don't create placeholder - just skip non-existent chats
              continue;
            }
          }
          chats = fetchedChats;
        }
        
        setAssignedChats(chats);
      }
    } catch (error) {
      console.error('Failed to fetch assigned chats:', error);
    } finally {
      setChatsLoading(false);
    }
  };

  const fetchAllSessions = async () => {
    try {
      setSessionsLoading(true);
      // Get all assigned chats first
      const chatsResponse = await api.get('/student/assigned-chats');
      if (chatsResponse.data.success) {
        let chats = chatsResponse.data.chats || [];
        
        // If chats array is empty but we have chat_ids, try to fetch chat details
        if (chats.length === 0 && chatsResponse.data.chat_ids && chatsResponse.data.chat_ids.length > 0) {
          const fetchedChats = [];
          for (const chatId of chatsResponse.data.chat_ids) {
            try {
              const chatResponse = await api.get('/ragflow/chats', {
                params: { id: chatId }
              });
              if (chatResponse.data.success && chatResponse.data.chats && chatResponse.data.chats.length > 0) {
                fetchedChats.push(chatResponse.data.chats[0]);
              }
            } catch (error) {
              console.error(`Failed to fetch chat ${chatId}:`, error);
              // Skip chats that don't exist instead of creating a placeholder
              continue;
            }
          }
          chats = fetchedChats;
        }
        
        const allSessionsList = [];

        // Fetch sessions for each assigned chat
        for (const chat of chats) {
          try {
            const sessionsResponse = await api.get(`/ragflow/chats/${chat.id}/sessions`);
            if (sessionsResponse.data.success && sessionsResponse.data.sessions) {
              // Add chat info to each session
              const sessionsWithChat = sessionsResponse.data.sessions.map(session => ({
                ...session,
                chat_id: chat.id,
                chat_name: chat.name || 'Unnamed Chat',
                chat_avatar: chat.avatar || null
              }));
              allSessionsList.push(...sessionsWithChat);
            }
          } catch (error) {
            console.error(`Failed to fetch sessions for chat ${chat.id}:`, error);
          }
        }

        // Sort by creation date (newest first)
        allSessionsList.sort((a, b) => {
          const dateA = a.create_date ? new Date(a.create_date) : new Date(0);
          const dateB = b.create_date ? new Date(b.create_date) : new Date(0);
          return dateB - dateA;
        });

        setAllSessions(allSessionsList);
      }
    } catch (error) {
      console.error('Failed to fetch all sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleNewConversation = () => {
    if (assignedChats.length === 0) {
      toast({
        title: t('toast.error'),
        description: t('studentDashboard.noChatAssistantsAssigned'),
        variant: 'destructive',
      });
      return;
    }

    if (assignedChats.length === 1) {
      // Only one chat assistant, create session directly
      createSession(assignedChats[0].id);
    } else {
      // Multiple chat assistants, show selection modal
      setNewConversationDialogOpen(true);
    }
  };

  const createSession = async (chatId) => {
    try {
      setCreatingSession(true);
      
      // Generate a default session name if not provided
      const name = sessionName.trim() || `${t('studentDashboard.newChat')} - ${new Date().toLocaleDateString()}`;
      
      const response = await api.post(`/ragflow/chats/${chatId}/sessions`, {
        name: name
      });

      if (response.data.success) {
        const sessionId = response.data.session?.id;
        if (sessionId) {
          toast({
            title: t('toast.success'),
            description: t('studentDashboard.sessionCreated'),
          });
          setNewConversationDialogOpen(false);
          setSessionName('');
          setSelectedChatId('');
          // Redirect to chat page
          navigate(`/student/chats/${chatId}/sessions/${sessionId}/messages`);
        } else {
          throw new Error('Session ID not returned');
        }
      } else {
        throw new Error(response.data.error || 'Failed to create session');
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || error.message || t('studentDashboard.failedToCreateSession'),
        variant: 'destructive',
      });
    } finally {
      setCreatingSession(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    
    if (!selectedChatId) {
      toast({
        title: t('toast.error'),
        description: t('studentDashboard.selectChatAssistant'),
        variant: 'destructive',
      });
      return;
    }

    await createSession(selectedChatId);
  };

  return (
    <div className="space-y-6">
      <div className="py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <History className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{t('studentDashboard.history')}</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('studentDashboard.chatHistory')}
              </p>
            </div>
          </div>
          <Button onClick={handleNewConversation} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('studentDashboard.newChat')}
          </Button>
        </div>
      </div>

      {/* Chat History */}
      <div className="bg-white rounded-lg">
        <div className="p-0">
                  {sessionsLoading ? (
                    <div className="p-8">
                      <Loading />
                    </div>
                  ) : allSessions.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageCircle className="h-8 w-8 text-primary opacity-60" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{t('studentDashboard.noChatsYet')}</h3>
                      <p className="text-muted-foreground mb-4">
                        {t('studentDashboard.startChatHint')}
                      </p>
                      <Button onClick={handleNewConversation} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('studentDashboard.newChat')}
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {allSessions.map((session) => {
                        const messageCount = session.messages ? session.messages.length : 0;
                        const lastMessage = session.messages && session.messages.length > 0 
                          ? session.messages[session.messages.length - 1] 
                          : null;
                        const lastMessageText = lastMessage?.content 
                          ? (lastMessage.content.length > 60 
                              ? lastMessage.content.substring(0, 60) + '...' 
                              : lastMessage.content)
                          : 'No messages yet';
                        const lastMessageTime = session.update_date 
                          ? new Date(session.update_date) 
                          : (session.create_date ? new Date(session.create_date) : null);
                        
                        const getScoreColor = (score) => {
                          if (score < 50) return 'bg-red-100 text-red-700 border-red-200';
                          if (score >= 50 && score < 60) return 'bg-orange-100 text-orange-700 border-orange-200';
                          if (score >= 60 && score < 75) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
                          return 'bg-green-100 text-green-700 border-green-200';
                        };

                        const formatTime = (date) => {
                          if (!date) return '';
                          const now = new Date();
                          const diffMs = now - date;
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMs / 3600000);
                          const diffDays = Math.floor(diffMs / 86400000);

                          if (diffMins < 1) return t('studentDashboard.justNow');
                          if (diffMins < 60) return t('studentDashboard.minutesAgo', { count: diffMins });
                          if (diffHours < 24) return t('studentDashboard.hoursAgo', { count: diffHours });
                          if (diffDays < 7) return t('studentDashboard.daysAgo', { count: diffDays });
                          return date.toLocaleDateString();
                        };

                        return (
                          <div
                            key={session.id}
                            className="p-5 hover:bg-muted/50 cursor-pointer transition-colors border-b last:border-b-0"
                            onClick={() => navigate(`/student/chats/${session.chat_id}/sessions/${session.id}/messages`)}
                          >
                            <div className="flex items-start gap-4">
                              {/* Avatar */}
                              <div className="flex-shrink-0">
                                {session.chat_avatar ? (
                                  <img 
                                    src={session.chat_avatar} 
                                    alt={session.chat_name || 'Chat'} 
                                    className="w-14 h-14 rounded-full object-cover border-2 border-primary/10"
                                  />
                                ) : (
                                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/10">
                                    <MessageCircle className="h-7 w-7 text-primary" />
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-base mb-1 truncate">
                                      {session.name || t('studentDashboard.unnamedSession')}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="secondary" className="text-xs">
                                        {session.chat_name || t('studentDashboard.chatAssistant')}
                                      </Badge>
                                      {session.evaluation_score !== null && session.evaluation_score !== undefined && (
                                        <Badge className={`text-xs ${getScoreColor(session.evaluation_score)}`}>
                                          {session.evaluation_score}/100
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {lastMessageTime && (
                                    <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                                      {formatTime(lastMessageTime)}
                                    </span>
                                  )}
                                </div>

                                {/* Last Message Preview */}
                                <div className="flex items-center justify-between gap-2 mt-2">
                                  <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                                    {lastMessageText}
                                  </p>
                                  {messageCount > 0 && (
                                    <Badge variant="outline" className="text-xs flex-shrink-0">
                                      {messageCount} {messageCount === 1 ? t('studentDashboard.message') : t('studentDashboard.messages')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
        </div>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={newConversationDialogOpen} onOpenChange={setNewConversationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('studentDashboard.newChat')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSession} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chat-assistant">{t('studentDashboard.selectChatAssistant')}</Label>
              <Select value={selectedChatId} onValueChange={setSelectedChatId} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('studentDashboard.selectChatAssistantPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {assignedChats.map((chat) => (
                    <SelectItem key={chat.id} value={chat.id}>
                      {chat.name || t('studentDashboard.unnamedChat')}
                      {chat.description && (
                        <span className="text-muted-foreground ml-2">
                          - {chat.description.substring(0, 30)}...
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-name">{t('studentDashboard.sessionName')} ({t('common.optional')})</Label>
              <Input
                id="session-name"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder={t('studentDashboard.sessionNamePlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('studentDashboard.sessionNameHint')}
              </p>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setNewConversationDialogOpen(false);
                  setSessionName('');
                  setSelectedChatId('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={creatingSession || !selectedChatId}>
                {creatingSession ? t('common.creating') : t('studentDashboard.createConversation')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

