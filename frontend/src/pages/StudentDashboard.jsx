import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import api from '../lib/api';
import { BookOpen, User, MessageSquare, MessageCircle, Calendar } from 'lucide-react';
import Loading from '../components/Loading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

export default function StudentDashboard() {
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignedChats, setAssignedChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [allSessions, setAllSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    fetchUser().finally(() => setLoading(false));
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
                chat_name: chat.name || 'Unnamed Chat'
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

  if (loading) {
    return <Loading />;
  }

  const studentProfile = user?.profile;

  return (
    <div className="space-y-6">
      <div className="py-2">
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Welcome, {studentProfile?.first_name} {studentProfile?.last_name}!
        </p>
      </div>

      {/* All Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle>My Conversations</CardTitle>
          </div>
          <CardDescription>All your conversation sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <Loading />
          ) : allSessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No conversations yet. Start a conversation from Chat Assistants.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session Name</TableHead>
                  <TableHead>Chat Assistant</TableHead>
                  <TableHead>Evaluation Score</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allSessions.map((session) => (
                  <TableRow 
                    key={session.id} 
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => navigate(`/student/chats/${session.chat_id}/sessions/${session.id}/messages`)}
                  >
                    <TableCell className="font-medium">
                      {session.name || 'Unnamed Session'}
                    </TableCell>
                    <TableCell>{session.chat_name}</TableCell>
                    <TableCell>
                      {session.evaluation_score !== null && session.evaluation_score !== undefined ? (
                        <div className="flex items-center space-x-2">
                          {(() => {
                            const score = session.evaluation_score;
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
                              <span className={`font-semibold ${colorClass}`}>
                                {score}/100
                              </span>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {session.messages ? session.messages.length : 0}
                    </TableCell>
                    <TableCell>
                      {session.create_date ? (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(session.create_date).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/student/chats/${session.chat_id}/sessions/${session.id}/messages`);
                        }}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            <CardDescription>Your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Full Name</p>
              <p className="text-lg">
                {studentProfile?.first_name} {studentProfile?.last_name}
              </p>
            </div>
            {studentProfile?.phone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-lg">{studentProfile.phone}</p>
              </div>
            )}
            {studentProfile?.date_of_birth && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                <p className="text-lg">{studentProfile.date_of_birth}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <CardTitle>My Groups</CardTitle>
            </div>
            <CardDescription>Groups you belong to</CardDescription>
          </CardHeader>
          <CardContent>
            {studentProfile?.groups && studentProfile.groups.length > 0 ? (
              <div className="space-y-3">
                {studentProfile.groups.map((group) => (
                  <div
                    key={group.id}
                    className="p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <h3 className="font-semibold">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.description}
                      </p>
                    )}
                    {group.instructors && group.instructors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">
                          Instructors: {group.instructors.map(i => `${i.first_name} ${i.last_name}`).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">You are not assigned to any groups yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Chats */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <CardTitle>Assigned Chat Assistants</CardTitle>
            </div>
            <CardDescription>Chat assistants you can interact with</CardDescription>
          </CardHeader>
          <CardContent>
            {chatsLoading ? (
              <Loading />
            ) : assignedChats.length === 0 ? (
              <p className="text-muted-foreground">No chat assistants assigned to you yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {assignedChats.map((chat) => (
                  <div
                    key={chat.id}
                    className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => {
                      // Navigate to create a new session or list sessions for this chat
                      navigate(`/student/chats/${chat.id}`);
                    }}
                  >
                    <h3 className="font-semibold">{chat.name || 'Unnamed Chat'}</h3>
                    {chat.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {chat.description}
                      </p>
                    )}
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/student/chats/${chat.id}`);
                        }}
                      >
                        Start Conversation
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

