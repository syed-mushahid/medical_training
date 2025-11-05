import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useToast } from '../components/ui/use-toast.jsx';
import { Plus, RefreshCw, Edit, Trash2, MessageSquare, UserCheck } from 'lucide-react';
import { Textarea } from '../components/ui/textarea';
import Loading from '../components/Loading';

export default function ChatAssistants() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedChats, setSelectedChats] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
    dataset_ids: [],
    llm: {
      model_name: '',
      temperature: 0.1,
      top_p: 0.3,
      presence_penalty: 0.4,
      frequency_penalty: 0.7,
    },
    prompt: {
      similarity_threshold: 0.2,
      keywords_similarity_weight: 0.7,
      top_n: 6,
      variables: [{ key: 'knowledge', optional: true }],
      rerank_model: '',
      empty_response: 'Sorry! No relevant content was found in the knowledge base!',
      opener: 'Hi! I am your assistant, can I help you?',
      show_quote: true,
      prompt: 'You are an intelligent assistant. Please summarize the content of the knowledge base to answer the question. Please list the data in the knowledge base and answer in detail. When all knowledge base content is irrelevant to the question, your answer must include the sentence "The answer you are looking for is not found in the knowledge base!" Answers need to consider chat history.',
      top_k: 1024,
    },
  });
  const [datasetInput, setDatasetInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchChats();
    fetchDatasets();
  }, []);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ragflow/chats');
      if (response.data.success) {
        setChats(response.data.chats || []);
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to fetch chat assistants',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to fetch chat assistants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDatasets = async () => {
    try {
      const response = await api.get('/ragflow/datasets');
      if (response.data.success) {
        setDatasets(response.data.datasets || []);
      }
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
    }
  };

  const handleAddDataset = () => {
    if (datasetInput.trim()) {
      setFormData({
        ...formData,
        dataset_ids: [...formData.dataset_ids, datasetInput.trim()],
      });
      setDatasetInput('');
    }
  };

  const handleRemoveDataset = (index) => {
    setFormData({
      ...formData,
      dataset_ids: formData.dataset_ids.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Chat name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await api.post('/ragflow/chats', formData);

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Chat assistant created successfully',
        });
        setDialogOpen(false);
        resetForm();
        fetchChats();
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to create chat assistant',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create chat assistant',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (chat) => {
    setSelectedChat(chat);
    setFormData({
      name: chat.name || '',
      avatar: chat.avatar || '',
      dataset_ids: chat.dataset_ids || [],
      llm: chat.llm || {
        model_name: '',
        temperature: 0.1,
        top_p: 0.3,
        presence_penalty: 0.4,
        frequency_penalty: 0.7,
      },
      prompt: chat.prompt || {
        similarity_threshold: 0.2,
        keywords_similarity_weight: 0.7,
        top_n: 6,
        variables: [{ key: 'knowledge', optional: true }],
        rerank_model: '',
        empty_response: '',
        opener: '',
        show_quote: true,
        prompt: '',
        top_k: 1024,
      },
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Chat name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await api.put(`/ragflow/chats/${selectedChat.id}`, formData);

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Chat assistant updated successfully',
        });
        setEditDialogOpen(false);
        setSelectedChat(null);
        resetForm();
        fetchChats();
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to update chat assistant',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update chat assistant',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      const response = await api.delete('/ragflow/chats', {
        data: { ids: [selectedChat.id] }
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Chat assistant deleted successfully',
        });
        setDeleteDialogOpen(false);
        setSelectedChat(null);
        fetchChats();
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to delete chat assistant',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete chat assistant',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      let idsToDelete = [];

      if (selectedChats.length > 0) {
        idsToDelete = selectedChats;
      } else {
        toast({
          title: 'Error',
          description: 'Please select at least one chat assistant to delete',
          variant: 'destructive',
        });
        return;
      }

      const response = await api.delete('/ragflow/chats', {
        data: { ids: idsToDelete }
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: `${idsToDelete.length} chat assistant(s) deleted successfully`,
        });
        setBulkDeleteDialogOpen(false);
        setSelectedChats([]);
        fetchChats();
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to delete chat assistants',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete chat assistants',
        variant: 'destructive',
      });
    }
  };

  const handleToggleSelect = (chatId) => {
    setSelectedChats(prev => 
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleSelectAll = () => {
    if (selectedChats.length === chats.length) {
      setSelectedChats([]);
    } else {
      setSelectedChats(chats.map(chat => chat.id));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      avatar: '',
      dataset_ids: [],
      llm: {
        model_name: '',
        temperature: 0.1,
        top_p: 0.3,
        presence_penalty: 0.4,
        frequency_penalty: 0.7,
      },
      prompt: {
        similarity_threshold: 0.2,
        keywords_similarity_weight: 0.7,
        top_n: 6,
        variables: [{ key: 'knowledge', optional: true }],
        rerank_model: '',
        empty_response: 'Sorry! No relevant content was found in the knowledge base!',
        opener: 'Hi! I am your assistant, can I help you?',
        show_quote: true,
        prompt: 'You are an intelligent assistant. Please summarize the content of the knowledge base to answer the question. Please list the data in the knowledge base and answer in detail. When all knowledge base content is irrelevant to the question, your answer must include the sentence "The answer you are looking for is not found in the knowledge base!" Answers need to consider chat history.',
        top_k: 1024,
      },
    });
    setDatasetInput('');
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center py-2">
        <div>
          <h1 className="text-2xl font-bold">Chat Assistants</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage chat assistants</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchChats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {selectedChats.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedChats.length})
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Chat Assistant
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
                    checked={selectedChats.length === chats.length && chats.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Dataset IDs</TableHead>
                <TableHead>LLM Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No chat assistants found
                  </TableCell>
                </TableRow>
              ) : (
                chats.map((chat) => (
                  <TableRow key={chat.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedChats.includes(chat.id)}
                        onChange={() => handleToggleSelect(chat.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{chat.name || '-'}</TableCell>
                    <TableCell>
                      {chat.dataset_ids && chat.dataset_ids.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {chat.dataset_ids.slice(0, 2).map((id, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                              {id.substring(0, 8)}...
                            </span>
                          ))}
                          {chat.dataset_ids.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                              +{chat.dataset_ids.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {chat.llm?.model_name || '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        chat.status === '1' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {chat.status === '1' ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/ragflow/chats/${chat.id}/assignments`)}
                          title="Manage Assignments"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/ragflow/chats/${chat.id}/sessions`)}
                          title="View Sessions"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(chat)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedChat(chat);
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

      {/* Create Chat Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Chat Assistant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter chat assistant name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar (Base64)</Label>
                <Input
                  id="avatar"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="Base64 encoded avatar"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="datasets">Dataset IDs</Label>
              <div className="flex space-x-2">
                <Select value={datasetInput} onValueChange={setDatasetInput}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((dataset) => (
                      <SelectItem key={dataset.id} value={dataset.id}>
                        {dataset.name} ({dataset.id.substring(0, 8)}...)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleAddDataset}>
                  Add
                </Button>
              </div>
              {formData.dataset_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.dataset_ids.map((id, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center space-x-1 font-mono"
                    >
                      <span>{id}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDataset(index)}
                        className="ml-1 hover:text-blue-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* LLM Configuration */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">LLM Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model_name">Model Name</Label>
                  <Input
                    id="model_name"
                    value={formData.llm.model_name}
                    onChange={(e) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, model_name: e.target.value }
                    })}
                    placeholder="e.g., qwen-plus@Tongyi-Qianwen"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={formData.llm.temperature}
                    onChange={(e) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, temperature: parseFloat(e.target.value) || 0.1 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="top_p">Top P</Label>
                  <Input
                    id="top_p"
                    type="number"
                    step="0.1"
                    value={formData.llm.top_p}
                    onChange={(e) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, top_p: parseFloat(e.target.value) || 0.3 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="presence_penalty">Presence Penalty</Label>
                  <Input
                    id="presence_penalty"
                    type="number"
                    step="0.1"
                    value={formData.llm.presence_penalty}
                    onChange={(e) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, presence_penalty: parseFloat(e.target.value) || 0.4 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency_penalty">Frequency Penalty</Label>
                  <Input
                    id="frequency_penalty"
                    type="number"
                    step="0.1"
                    value={formData.llm.frequency_penalty}
                    onChange={(e) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, frequency_penalty: parseFloat(e.target.value) || 0.7 }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Prompt Configuration */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Prompt Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="similarity_threshold">Similarity Threshold</Label>
                  <Input
                    id="similarity_threshold"
                    type="number"
                    step="0.1"
                    value={formData.prompt.similarity_threshold}
                    onChange={(e) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, similarity_threshold: parseFloat(e.target.value) || 0.2 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keywords_similarity_weight">Keywords Similarity Weight</Label>
                  <Input
                    id="keywords_similarity_weight"
                    type="number"
                    step="0.1"
                    value={formData.prompt.keywords_similarity_weight}
                    onChange={(e) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, keywords_similarity_weight: parseFloat(e.target.value) || 0.7 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="top_n">Top N</Label>
                  <Input
                    id="top_n"
                    type="number"
                    value={formData.prompt.top_n}
                    onChange={(e) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, top_n: parseInt(e.target.value) || 6 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="top_k">Top K</Label>
                  <Input
                    id="top_k"
                    type="number"
                    value={formData.prompt.top_k}
                    onChange={(e) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, top_k: parseInt(e.target.value) || 1024 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rerank_model">Rerank Model</Label>
                  <Input
                    id="rerank_model"
                    value={formData.prompt.rerank_model}
                    onChange={(e) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, rerank_model: e.target.value }
                    })}
                    placeholder="Optional rerank model"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="show_quote">Show Quote</Label>
                  <Select
                    value={formData.prompt.show_quote ? 'true' : 'false'}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, show_quote: value === 'true' }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="opener">Opener</Label>
                <Input
                  id="opener"
                  value={formData.prompt.opener}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, opener: e.target.value }
                  })}
                  placeholder="Opening greeting"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="empty_response">Empty Response</Label>
                <Input
                  id="empty_response"
                  value={formData.prompt.empty_response}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, empty_response: e.target.value }
                  })}
                  placeholder="Response when no content found"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">System Prompt</Label>
                <Textarea
                  id="prompt"
                  value={formData.prompt.prompt}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, prompt: e.target.value }
                  })}
                  placeholder="System prompt for the assistant"
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Create Chat Assistant</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Chat Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Chat Assistant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter chat assistant name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-avatar">Avatar (Base64)</Label>
                <Input
                  id="edit-avatar"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="Base64 encoded avatar"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-datasets">Dataset IDs</Label>
              <div className="flex space-x-2">
                <Select value={datasetInput} onValueChange={setDatasetInput}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((dataset) => (
                      <SelectItem key={dataset.id} value={dataset.id}>
                        {dataset.name} ({dataset.id.substring(0, 8)}...)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleAddDataset}>
                  Add
                </Button>
              </div>
              {formData.dataset_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.dataset_ids.map((id, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center space-x-1 font-mono"
                    >
                      <span>{id}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDataset(index)}
                        className="ml-1 hover:text-blue-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* LLM Configuration */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">LLM Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-model_name">Model Name</Label>
                  <Input
                    id="edit-model_name"
                    value={formData.llm.model_name || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, model_name: e.target.value }
                    })}
                    placeholder="e.g., qwen-plus@Tongyi-Qianwen"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-temperature">Temperature</Label>
                  <Input
                    id="edit-temperature"
                    type="number"
                    step="0.1"
                    value={formData.llm.temperature || 0.1}
                    onChange={(e) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, temperature: parseFloat(e.target.value) || 0.1 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-top_p">Top P</Label>
                  <Input
                    id="edit-top_p"
                    type="number"
                    step="0.1"
                    value={formData.llm.top_p || 0.3}
                    onChange={(e) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, top_p: parseFloat(e.target.value) || 0.3 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-presence_penalty">Presence Penalty</Label>
                  <Input
                    id="edit-presence_penalty"
                    type="number"
                    step="0.1"
                    value={formData.llm.presence_penalty || 0.2}
                    onChange={(e) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, presence_penalty: parseFloat(e.target.value) || 0.2 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-frequency_penalty">Frequency Penalty</Label>
                  <Input
                    id="edit-frequency_penalty"
                    type="number"
                    step="0.1"
                    value={formData.llm.frequency_penalty || 0.7}
                    onChange={(e) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, frequency_penalty: parseFloat(e.target.value) || 0.7 }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Prompt Configuration */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Prompt Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-similarity_threshold">Similarity Threshold</Label>
                  <Input
                    id="edit-similarity_threshold"
                    type="number"
                    step="0.1"
                    value={formData.prompt.similarity_threshold || 0.2}
                    onChange={(e) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, similarity_threshold: parseFloat(e.target.value) || 0.2 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-keywords_similarity_weight">Keywords Similarity Weight</Label>
                  <Input
                    id="edit-keywords_similarity_weight"
                    type="number"
                    step="0.1"
                    value={formData.prompt.keywords_similarity_weight || 0.7}
                    onChange={(e) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, keywords_similarity_weight: parseFloat(e.target.value) || 0.7 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-top_n">Top N</Label>
                  <Input
                    id="edit-top_n"
                    type="number"
                    value={formData.prompt.top_n || 8}
                    onChange={(e) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, top_n: parseInt(e.target.value) || 8 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-top_k">Top K</Label>
                  <Input
                    id="edit-top_k"
                    type="number"
                    value={formData.prompt.top_k || 1024}
                    onChange={(e) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, top_k: parseInt(e.target.value) || 1024 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-rerank_model">Rerank Model</Label>
                  <Input
                    id="edit-rerank_model"
                    value={formData.prompt.rerank_model || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, rerank_model: e.target.value }
                    })}
                    placeholder="Optional rerank model"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-show_quote">Show Quote</Label>
                  <Select
                    value={formData.prompt.show_quote !== false ? 'true' : 'false'}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, show_quote: value === 'true' }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-opener">Opener</Label>
                <Input
                  id="edit-opener"
                  value={formData.prompt.opener || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, opener: e.target.value }
                  })}
                  placeholder="Opening greeting"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-empty_response">Empty Response</Label>
                <Input
                  id="edit-empty_response"
                  value={formData.prompt.empty_response || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, empty_response: e.target.value }
                  })}
                  placeholder="Response when no content found"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-prompt">System Prompt</Label>
                <Textarea
                  id="edit-prompt"
                  value={formData.prompt.prompt || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, prompt: e.target.value }
                  })}
                  placeholder="System prompt for the assistant"
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setEditDialogOpen(false);
                setSelectedChat(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Update Chat Assistant</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat Assistant</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{selectedChat?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedChat(null);
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
            <DialogTitle>Delete Chat Assistants</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete {selectedChats.length} chat assistant(s)? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setBulkDeleteDialogOpen(false);
            }}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleBulkDelete}>
              Delete {selectedChats.length} Chat(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

