import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast.jsx';
import { Plus, RefreshCw, Edit, Trash2, ArrowLeft, MessageCircle } from 'lucide-react';
import Loading from '../components/Loading';

export default function ChatSessions() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [chatInfo, setChatInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    user_id: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
    fetchChatInfo();
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
      console.error('Failed to fetch chat info:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/ragflow/chats/${chatId}/sessions`);
      if (response.data.success) {
        setSessions(response.data.sessions || []);
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to fetch sessions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to fetch sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Session name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await api.post(`/ragflow/chats/${chatId}/sessions`, formData);

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Session created successfully',
        });
        setDialogOpen(false);
        resetForm();
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
    }
  };

  const handleEdit = (session) => {
    setSelectedSession(session);
    setFormData({
      name: session.name || '',
      user_id: session.user_id || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Session name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await api.put(`/ragflow/chats/${chatId}/sessions/${selectedSession.id}`, formData);

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Session updated successfully',
        });
        setEditDialogOpen(false);
        setSelectedSession(null);
        resetForm();
        fetchSessions();
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to update session',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update session',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      const response = await api.delete(`/ragflow/chats/${chatId}/sessions`, {
        data: { ids: [selectedSession.id] }
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Session deleted successfully',
        });
        setDeleteDialogOpen(false);
        setSelectedSession(null);
        fetchSessions();
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to delete session',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete session',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      let idsToDelete = [];

      if (selectedSessions.length > 0) {
        idsToDelete = selectedSessions;
      } else {
        toast({
          title: 'Error',
          description: 'Please select at least one session to delete',
          variant: 'destructive',
        });
        return;
      }

      const response = await api.delete(`/ragflow/chats/${chatId}/sessions`, {
        data: { ids: idsToDelete }
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: `${idsToDelete.length} session(s) deleted successfully`,
        });
        setBulkDeleteDialogOpen(false);
        setSelectedSessions([]);
        fetchSessions();
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to delete sessions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete sessions',
        variant: 'destructive',
      });
    }
  };

  const handleToggleSelect = (sessionId) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSessions.length === sessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(sessions.map(session => session.id));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      user_id: '',
    });
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/ragflow/chats')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Chat Sessions</h1>
          </div>
          <p className="text-muted-foreground">
            {chatInfo ? `Managing sessions for: ${chatInfo.name}` : `Chat ID: ${chatId}`}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchSessions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {selectedSessions.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedSessions.length})
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Session
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedSessions.length === sessions.length && sessions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Messages Count</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No sessions found
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedSessions.includes(session.id)}
                        onChange={() => handleToggleSelect(session.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{session.name || '-'}</TableCell>
                    <TableCell>
                      {session.messages ? session.messages.length : 0}
                    </TableCell>
                    <TableCell>
                      {session.create_date ? new Date(session.create_date).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      {session.update_date ? new Date(session.update_date).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/ragflow/chats/${chatId}/sessions/${session.id}/messages`)}
                          title="View Messages"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(session)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSession(session);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
            <DialogTitle>Create Session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter session name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_id">User ID (Optional)</Label>
              <Input
                id="user_id"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                placeholder="Optional user-defined ID"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Create Session</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter session name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user_id">User ID (Optional)</Label>
              <Input
                id="edit-user_id"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                placeholder="Optional user-defined ID"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setEditDialogOpen(false);
                setSelectedSession(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Update Session</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{selectedSession?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedSession(null);
            }}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sessions</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete {selectedSessions.length} session(s)? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setBulkDeleteDialogOpen(false);
            }}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleBulkDelete}>
              Delete {selectedSessions.length} Session(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

