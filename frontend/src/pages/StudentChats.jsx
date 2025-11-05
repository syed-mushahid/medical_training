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

export default function StudentChats() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [chatInfo, setChatInfo] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [assignedChats, setAssignedChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);
  const { toast } = useToast();

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

  const handleCreateSession = async (e) => {
    e.preventDefault();
    
    if (!sessionName.trim()) {
      toast({
        title: 'Error',
        description: 'Session name is required',
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
        toast({
          title: 'Success',
          description: 'Session created successfully',
        });
        setDialogOpen(false);
        setSessionName('');
        fetchSessions();
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to create session',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create session',
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
          <h1 className="text-2xl font-bold">Chat Assistants</h1>
          <p className="text-muted-foreground mt-1 text-sm">Chat assistants assigned to you</p>
        </div>

        {chatsLoading ? (
          <Loading />
        ) : assignedChats.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No chat assistants assigned to you yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignedChats.map((chat) => (
              <Card
                key={chat.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/student/chats/${chat.id}`)}
              >
                <CardHeader>
                  <CardTitle>{chat.name || 'Unnamed Chat'}</CardTitle>
                  {chat.description && (
                    <CardDescription className="line-clamp-2">
                      {chat.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/student/chats/${chat.id}`);
                    }}
                  >
                    View Sessions
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
            <h1 className="text-2xl font-bold">
              {chatInfo?.name || 'Chat Assistant'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {chatInfo?.description || 'Start a conversation with this chat assistant'}
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Conversations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Name</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No conversations yet. Create a new conversation to get started!
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.name || 'Unnamed Session'}
                    </TableCell>
                    <TableCell>
                      {session.messages ? session.messages.length : 0}
                    </TableCell>
                    <TableCell>
                      {session.create_date ? new Date(session.create_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {session.update_date ? new Date(session.update_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/student/chats/${chatId}/sessions/${session.id}/messages`)}
                        title="View Messages"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Session Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Conversation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSession} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-name">Session Name</Label>
              <Input
                id="session-name"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Enter session name"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setDialogOpen(false);
                setSessionName('');
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingSession}>
                {creatingSession ? 'Creating...' : 'Create Session'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

