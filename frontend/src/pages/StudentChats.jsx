import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { useToast } from '../components/ui/use-toast.jsx';
import { ArrowLeft, MessageCircle, Plus, MessageSquare } from 'lucide-react';
import Loading from '../components/Loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { useTranslation } from 'react-i18next';

export default function StudentChats() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [chatInfo, setChatInfo] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [assignedChats, setAssignedChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startChatDialogOpen, setStartChatDialogOpen] = useState(false);
  const [selectedChatIdForStart, setSelectedChatIdForStart] = useState(null);
  const [sessionName, setSessionName] = useState('');
  const [startChatSessionName, setStartChatSessionName] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (chatId) {
      setLoading(true);
      fetchChatInfo();
      fetchSessions();
    } else {
      setLoading(false); // Ensure loading is false when showing chat list
      fetchAssignedChats();
    }
  }, [chatId]);

  const fetchChatInfo = async () => {
    try {
      const response = await api.get('/ragflow/chats', {
        params: { id: chatId }
      });
      if (response.data.success && response.data.chats && response.data.chats.length > 0) {
        setChatInfo(response.data.chats[0]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to fetch chat info',
        variant: 'destructive',
      });
    }
  };

  const fetchAssignedChats = async () => {
    try {
      setChatsLoading(true);
      const response = await api.get('/student/assigned-chats');
      if (response.data.success) {
        let chats = response.data.chats || [];
        const unavailableChatIds = response.data.unavailable_chat_ids || [];
        const chatIds = response.data.chat_ids || [];
        
        // If chats array is empty but we have chat_ids, try to fetch chat details
        if (chats.length === 0 && chatIds.length > 0) {
          const fetchedChats = [];
          for (const chatIdItem of chatIds) {
            // Skip if already marked as unavailable
            if (unavailableChatIds.includes(chatIdItem)) {
              continue;
            }
            try {
              const chatResponse = await api.get('/ragflow/chats', {
                params: { id: chatIdItem }
              });
              if (chatResponse.data.success && chatResponse.data.chats && chatResponse.data.chats.length > 0) {
                fetchedChats.push(chatResponse.data.chats[0]);
              }
            } catch (error) {
              // Chat doesn't exist in RAGFlow, skip it
              console.error(`Failed to fetch chat ${chatIdItem}:`, error);
              // Don't create placeholder - just skip non-existent chats
              continue;
            }
          }
          chats = fetchedChats;
        }
        
        // Store unavailable chat IDs for display
        if (unavailableChatIds.length > 0) {
          // Show a toast notification about unavailable chats
          toast({
            title: 'Chat Assistant Unavailable',
            description: `${unavailableChatIds.length} chat assistant(s) that were assigned to you are no longer available.`,
            variant: 'destructive',
          });
        }
        
        setAssignedChats(chats);
      } else {
        // If success is false, still set empty array
        setAssignedChats([]);
      }
    } catch (error) {
      console.error('Failed to fetch assigned chats:', error);
      setAssignedChats([]); // Set empty array on error
    } finally {
      setChatsLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/ragflow/chats/${chatId}/sessions`);
      if (response.data.success) {
        // Filter to only show sessions that belong to this student
        // For now, show all sessions (backend should filter)
        setSessions(response.data.sessions || []);
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to fetch sessions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch sessions';
      // Check if chat doesn't exist
      if (error.response?.status === 400 && errorMessage.includes("doesn't exist") || errorMessage.includes("not found")) {
        toast({
          title: 'Chat Assistant Unavailable',
          description: 'This chat assistant is no longer available. Any sessions you had with this assistant are no longer accessible.',
          variant: 'destructive',
        });
        // Navigate back to chat list
        setTimeout(() => {
          navigate('/student/chats');
        }, 2000);
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartChatClick = (chatIdToUse) => {
    setSelectedChatIdForStart(chatIdToUse);
    setStartChatDialogOpen(true);
  };

  const handleStartChat = async (e) => {
    e.preventDefault();
    
    if (!selectedChatIdForStart) {
      return;
    }

    try {
      setCreatingSession(true);
      const name = startChatSessionName.trim() || `${t('studentDashboard.newChat')} - ${new Date().toLocaleDateString()}`;
      
      const response = await api.post(`/ragflow/chats/${selectedChatIdForStart}/sessions`, {
        name: name
      });

      if (response.data.success) {
        const sessionId = response.data.session?.id;
        if (sessionId) {
          toast({
            title: t('toast.success'),
            description: t('studentDashboard.sessionCreated'),
          });
          setStartChatDialogOpen(false);
          setStartChatSessionName('');
          setSelectedChatIdForStart(null);
          navigate(`/student/chats/${selectedChatIdForStart}/sessions/${sessionId}/messages`);
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
    
    if (!sessionName.trim()) {
      toast({
        title: t('toast.error'),
        description: t('studentDashboard.sessionNameRequired'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingSession(true);
      const response = await api.post(`/ragflow/chats/${chatId}/sessions`, {
        name: sessionName.trim()
      });

      if (response.data.success) {
        const sessionId = response.data.session?.id;
        if (sessionId) {
          toast({
            title: t('toast.success'),
            description: t('studentDashboard.sessionCreated'),
          });
          setDialogOpen(false);
          setSessionName('');
          navigate(`/student/chats/${chatId}/sessions/${sessionId}/messages`);
        } else {
          throw new Error('Session ID not returned');
        }
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('studentDashboard.failedToCreateSession'),
          variant: 'destructive',
        });
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

  // Show loading only if we're loading chats (when no chatId) or loading sessions (when chatId exists)
  if ((!chatId && chatsLoading) || (chatId && loading)) {
    return <Loading />;
  }

  // If no chatId, show list of assigned chats
  if (!chatId) {
    return (
      <div className="space-y-6">
        <div className="py-2">
          <h1 className="text-2xl font-bold">{t('layout.chatAssistants')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('studentDashboard.chatAssistantsYouCanInteract')}</p>
        </div>

        {chatsLoading ? (
          <Loading />
        ) : assignedChats.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('studentDashboard.noChatAssistantsAssigned')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignedChats.map((chat) => (
              <Card
                key={chat.id}
                className="hover:shadow-md transition-all shadow-sm border-0 bg-white cursor-pointer"
                onClick={() => navigate(`/student/chats/${chat.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {chat.avatar ? (
                      <img 
                        src={chat.avatar} 
                        alt={chat.name || 'Avatar'} 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <CardTitle>{chat.name || 'Unnamed Chat'}</CardTitle>
                  </div>
                  {chat.description && (
                    <CardDescription className="line-clamp-2">
                      {chat.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartChatClick(chat.id, e);
                    }}
                    disabled={creatingSession}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('studentDashboard.startChat')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/student/chats/${chat.id}`);
                    }}
                  >
                    {t('studentDashboard.viewChats')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {/* Start Chat Dialog (for Chat Assistant cards) */}
      <Dialog open={startChatDialogOpen} onOpenChange={setStartChatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('studentDashboard.startChat')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStartChat} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start-chat-session-name">{t('studentDashboard.sessionName')} ({t('common.optional')})</Label>
              <Input
                id="start-chat-session-name"
                value={startChatSessionName}
                onChange={(e) => setStartChatSessionName(e.target.value)}
                placeholder={t('studentDashboard.sessionNamePlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('studentDashboard.sessionNameHint')}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setStartChatDialogOpen(false);
                setStartChatSessionName('');
                setSelectedChatIdForStart(null);
              }}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={creatingSession}>
                {creatingSession ? t('common.creating') : t('studentDashboard.startChat')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/student/chats')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              {chatInfo?.avatar ? (
                <img 
                  src={chatInfo.avatar} 
                  alt={chatInfo.name || 'Avatar'} 
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  {chatInfo?.name || t('studentDashboard.chatAssistant')}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  {chatInfo?.description || t('studentDashboard.startChatHint')}
                </p>
              </div>
            </div>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('studentDashboard.newChat')}
        </Button>
      </div>

      <div className="bg-white rounded-lg">
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-primary opacity-60" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('studentDashboard.noChatsYet')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('studentDashboard.startChatHint')}
              </p>
              <Button onClick={() => setDialogOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t('studentDashboard.newChat')}
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map((session) => {
                const messageCount = session.messages ? session.messages.length : 0;
                const lastMessage = session.messages && session.messages.length > 0 
                  ? session.messages[session.messages.length - 1] 
                  : null;
                const lastMessageText = lastMessage?.content 
                  ? (lastMessage.content.length > 60 
                      ? lastMessage.content.substring(0, 60) + '...' 
                      : lastMessage.content)
                  : t('studentDashboard.noMessagesYet');
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
                    onClick={() => navigate(`/student/chats/${chatId}/sessions/${session.id}/messages`)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {chatInfo?.avatar ? (
                          <img 
                            src={chatInfo.avatar} 
                            alt={chatInfo.name || 'Chat'} 
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
                              {session.name || t('studentDashboard.unnamedChat')}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {chatInfo?.name || t('studentDashboard.chatAssistant')}
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
        </CardContent>
      </div>

      {/* Create Chat Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('studentDashboard.newChat')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSession} className="space-y-4">
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
              <Button type="button" variant="outline" onClick={() => {
                setDialogOpen(false);
                setSessionName('');
              }}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={creatingSession}>
                {creatingSession ? t('common.creating') : t('studentDashboard.createConversation')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

