import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useToast } from './ui/use-toast.jsx';
import api from '../lib/api';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NewChatButton({ variant = 'default', size = 'default', className }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignedChats, setAssignedChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    if (dialogOpen && assignedChats.length === 0) {
      fetchAssignedChats();
    }
  }, [dialogOpen]);

  const fetchAssignedChats = async () => {
    try {
      setChatsLoading(true);
      const response = await api.get('/student/assigned-chats');
      if (response.data.success) {
        let chats = response.data.chats || [];
        
        if (chats.length === 0 && response.data.chat_ids && response.data.chat_ids.length > 0) {
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
              console.error(`Failed to fetch chat ${chatId}:`, error);
              continue;
            }
          }
          chats = fetchedChats;
        }
        
        setAssignedChats(chats);
        return chats;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch assigned chats:', error);
      return [];
    } finally {
      setChatsLoading(false);
    }
  };

  const handleClick = async () => {
    const chats = await fetchAssignedChats();
    
    if (!chats || chats.length === 0) {
      toast({
        title: t('toast.error'),
        description: t('studentDashboard.noChatAssistantsAssigned'),
        variant: 'destructive',
      });
      return;
    }

    if (chats.length === 1) {
      createSession(chats[0].id);
    } else {
      setDialogOpen(true);
    }
  };

  const createSession = async (chatId) => {
    try {
      setCreatingSession(true);
      
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
          setDialogOpen(false);
          setSessionName('');
          setSelectedChatId('');
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
    <>
      <Button onClick={handleClick} variant={variant} size={size} className={className}>
        <Plus className="h-4 w-4 mr-3" />
        <span>{t('layout.newChat')}</span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('studentDashboard.newChat')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSession} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chat-assistant">{t('studentDashboard.selectChatAssistant')}</Label>
              {chatsLoading ? (
                <div className="text-sm text-muted-foreground">Loading chat assistants...</div>
              ) : (
                <Select value={selectedChatId} onValueChange={setSelectedChatId} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t('studentDashboard.selectChatAssistantPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedChats.map((chat) => (
                      <SelectItem key={chat.id} value={chat.id}>
                        <div className="flex items-center space-x-2">
                          {chat.avatar && (
                            <img 
                              src={chat.avatar} 
                              alt={chat.name || 'Avatar'} 
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          )}
                          <span>{chat.name || t('studentDashboard.unnamedChat')}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
                  setDialogOpen(false);
                  setSessionName('');
                  setSelectedChatId('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={creatingSession || !selectedChatId || chatsLoading}>
                {creatingSession ? t('common.creating') : t('studentDashboard.createConversation')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

