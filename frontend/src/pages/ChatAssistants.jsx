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
import { Plus, RefreshCw, Edit, Trash2, MessageSquare, UserCheck, Info } from 'lucide-react';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { MultiSelect } from '../components/ui/multi-select';
import Loading from '../components/Loading';
import { useTranslation } from 'react-i18next';
import AvatarSelector from '../components/AvatarSelector';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

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
    description: '',
    avatar: '',
    dataset_ids: [],
    llm: {
      model_name: '',
      temperature: 0.1,
      top_p: 0.3,
      presence_penalty: 0.4,
      frequency_penalty: 0.7,
      reasoning: false,
    },
    prompt: {
      similarity_threshold: 0.2,
      keywords_similarity_weight: 0.7,
      top_n: 6,
      variables: [{ key: 'knowledge', optional: true }],
      empty_response: 'Sorry! No relevant content was found in the knowledge base!',
      opener: 'Hi! I am your assistant, can I help you?',
      show_quote: true,
      prompt: 'You are an intelligent assistant. Please summarize the content of the knowledge base to answer the question. Please list the data in the knowledge base and answer in detail. When all knowledge base content is irrelevant to the question, your answer must include the sentence "The answer you are looking for is not found in the knowledge base!" Answers need to consider chat history.',
      top_k: 1024,
      keyword_analysis: false,
      cross_languages: [],
    },
  });
  const { toast } = useToast();
  const { t } = useTranslation();

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
          title: t('toast.error'),
          description: response.data.error || t('chatAssistants.failedToFetch'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('chatAssistants.failedToFetch'),
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
          title: t('toast.success'),
          description: t('chatAssistants.createdSuccessfully'),
        });
        setDialogOpen(false);
        resetForm();
        fetchChats();
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('chatAssistants.failedToCreate'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('chatAssistants.failedToCreate'),
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (chat) => {
    setSelectedChat(chat);
    
    // Extract dataset IDs from datasets array
    const datasetIds = chat.datasets && Array.isArray(chat.datasets) 
      ? chat.datasets.map(ds => ds.id) 
      : (chat.dataset_ids || []);
    
    // Normalize cross_languages - ensure they match the capitalized format
    const normalizeCrossLanguages = (languages) => {
      if (!languages || !Array.isArray(languages)) return [];
      // Valid language values (capitalized)
      const validLanguages = ['English', 'Chinese', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Vietnamese'];
      return languages.map(lang => {
        const langStr = String(lang).trim();
        // Check if already in correct format
        if (validLanguages.includes(langStr)) {
          return langStr;
        }
        // Try to match by case-insensitive comparison
        const matched = validLanguages.find(v => v.toLowerCase() === langStr.toLowerCase());
        return matched || langStr; // Return matched or original if not found
      }).filter(lang => validLanguages.includes(lang)); // Filter out invalid languages
    };
    
    setFormData({
      name: chat.name || '',
      description: chat.description || '',
      avatar: chat.avatar || '',
      dataset_ids: datasetIds,
      llm: {
        model_name: chat.llm?.model_name || '',
        temperature: chat.llm?.temperature ?? 0.1,
        top_p: chat.llm?.top_p ?? 0.3,
        presence_penalty: chat.llm?.presence_penalty ?? 0.4,
        frequency_penalty: chat.llm?.frequency_penalty ?? 0.7,
        reasoning: chat.llm?.reasoning ?? chat.prompt?.reasoning ?? false,
      },
      prompt: {
        similarity_threshold: chat.prompt?.similarity_threshold ?? 0.2,
        keywords_similarity_weight: chat.prompt?.keywords_similarity_weight ?? 0.7,
        top_n: chat.prompt?.top_n ?? 6,
        variables: chat.prompt?.variables || [{ key: 'knowledge', optional: true }],
        empty_response: chat.prompt?.empty_response || '',
        opener: chat.prompt?.opener || '',
        show_quote: chat.prompt?.show_quote !== false,
        prompt: chat.prompt?.prompt || '',
        top_k: chat.prompt?.top_k ?? chat.top_k ?? 1024,
        keyword_analysis: chat.prompt?.keyword_analysis ?? chat.prompt?.keyword ?? false,
        cross_languages: normalizeCrossLanguages(chat.prompt?.cross_languages),
      },
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: t('toast.error'),
        description: t('chatAssistants.nameRequired'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await api.put(`/ragflow/chats/${selectedChat.id}`, formData);

      if (response.data.success) {
        toast({
          title: t('toast.success'),
          description: t('chatAssistants.updatedSuccessfully'),
        });
        setEditDialogOpen(false);
        setSelectedChat(null);
        resetForm();
        fetchChats();
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('chatAssistants.failedToUpdate'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('chatAssistants.failedToUpdate'),
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
          title: t('toast.success'),
          description: t('chatAssistants.deletedSuccessfully'),
        });
        setDeleteDialogOpen(false);
        setSelectedChat(null);
        fetchChats();
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('chatAssistants.failedToDelete'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('chatAssistants.failedToDelete'),
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
          title: t('toast.error'),
          description: t('chatAssistants.selectAtLeastOne'),
          variant: 'destructive',
        });
        return;
      }

      const response = await api.delete('/ragflow/chats', {
        data: { ids: idsToDelete }
      });

      if (response.data.success) {
        toast({
          title: t('toast.success'),
          description: t('chatAssistants.bulkDeletedSuccessfully', { count: idsToDelete.length }),
        });
        setBulkDeleteDialogOpen(false);
        setSelectedChats([]);
        fetchChats();
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('chatAssistants.failedToBulkDelete'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('chatAssistants.failedToBulkDelete'),
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
      description: '',
      avatar: '',
      dataset_ids: [],
      llm: {
        model_name: '',
        temperature: 0.1,
        top_p: 0.3,
        presence_penalty: 0.4,
        frequency_penalty: 0.7,
        reasoning: false,
      },
      prompt: {
        similarity_threshold: 0.2,
        keywords_similarity_weight: 0.7,
        top_n: 6,
        variables: [{ key: 'knowledge', optional: true }],
        empty_response: 'Sorry! No relevant content was found in the knowledge base!',
        opener: 'Hi! I am your assistant, can I help you?',
        show_quote: true,
        prompt: 'You are an intelligent assistant. Please summarize the content of the knowledge base to answer the question. Please list the data in the knowledge base and answer in detail. When all knowledge base content is irrelevant to the question, your answer must include the sentence "The answer you are looking for is not found in the knowledge base!" Answers need to consider chat history.',
        top_k: 1024,
        keyword_analysis: false,
        cross_languages: [],
      },
    });
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center py-2">
        <div>
          <h1 className="text-2xl font-bold">{t('chatAssistants.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('chatAssistants.subtitle')}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchChats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
          {selectedChats.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('chatAssistants.deleteSelected')} ({selectedChats.length})
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('chatAssistants.createChatAssistant')}
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
                <TableHead>{t('chatAssistants.name')}</TableHead>
                <TableHead>{t('chatAssistants.description')}</TableHead>
                <TableHead>{t('chatAssistants.datasetIds')}</TableHead>
                <TableHead>{t('chatAssistants.llmModel')}</TableHead>
                <TableHead>{t('chatAssistants.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {t('chatAssistants.noChatAssistantsFound')}
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
                    <TableCell>
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
                        <span className="font-medium">{chat.name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.description || '-'}
                      </p>
                    </TableCell>
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
                        {chat.status === '1' ? t('chatAssistants.active') : t('chatAssistants.inactive')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/ragflow/chats/${chat.id}/assignments`)}
                          title={t('chatAssistants.manageAssignments')}
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/ragflow/chats/${chat.id}/sessions`)}
                          title={t('chatAssistants.viewSessions')}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(chat)}
                          title={t('common.edit')}
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
                          title={t('common.delete')}
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
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
            <DialogHeader>
              <DialogTitle>{t('chatAssistants.createChatAssistant')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <TooltipProvider>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="name">{t('chatAssistants.name')} *</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('chatAssistants.tooltips.name')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('chatAssistants.namePlaceholder')}
                  required
                />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="description">{t('chatAssistants.description')}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('chatAssistants.tooltips.description')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('chatAssistants.descriptionPlaceholder')}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('chatAssistants.selectAvatar')}</Label>
              <AvatarSelector
                value={formData.avatar}
                  onChange={(base64) => setFormData({ ...formData, avatar: base64 })}
                />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="datasets">{t('chatAssistants.datasetIds')}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('chatAssistants.tooltips.datasetIds')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
              <MultiSelect
                options={datasets.map((dataset) => ({
                  value: dataset.id,
                  label: `${dataset.name} (${dataset.id.substring(0, 8)}...)`
                }))}
                selected={formData.dataset_ids}
                onChange={(selected) => setFormData({
                  ...formData,
                  dataset_ids: selected
                })}
                placeholder={t('chatAssistants.selectDatasets')}
                searchPlaceholder={t('chatAssistants.searchDatasets')}
                  emptyMessage={t('chatAssistants.noDatasetsFound')}
                />
                </div>

                {/* LLM Configuration */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">{t('chatAssistants.llmConfiguration')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="model_name">{t('chatAssistants.modelName')}</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{t('chatAssistants.tooltips.modelName')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                  <Select
                    value={formData.llm.model_name}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, model_name: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('chatAssistants.selectModel')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-3.5-turbo@OpenAI">gpt-3.5-turbo@OpenAI</SelectItem>
                      <SelectItem value="gpt-3.5-turbo-16k-0613@OpenAI">gpt-3.5-turbo-16k-0613@OpenAI</SelectItem>
                      <SelectItem value="gpt-4@OpenAI">gpt-4@OpenAI</SelectItem>
                      <SelectItem value="gpt-4-32k@OpenAI">gpt-4-32k@OpenAI</SelectItem>
                      <SelectItem value="gpt-4-turbo@OpenAI">gpt-4-turbo@OpenAI</SelectItem>
                      <SelectItem value="gpt-4.1@OpenAI">gpt-4.1@OpenAI</SelectItem>
                      <SelectItem value="gpt-4.1-mini@OpenAI">gpt-4.1-mini@OpenAI</SelectItem>
                      <SelectItem value="gpt-4.1-nano@OpenAI">gpt-4.1-nano@OpenAI</SelectItem>
                      <SelectItem value="gpt-4.5-preview@OpenAI">gpt-4.5-preview@OpenAI</SelectItem>
                      <SelectItem value="gpt-4o@OpenAI">gpt-4o@OpenAI</SelectItem>
                      <SelectItem value="gpt-4o-mini@OpenAI">gpt-4o-mini@OpenAI</SelectItem>
                      <SelectItem value="gpt-5@OpenAI@OpenAI">gpt-5@OpenAI@OpenAI</SelectItem>
                      <SelectItem value="gpt-5-chat-latest@OpenAI">gpt-5-chat-latest@OpenAI</SelectItem>
                      <SelectItem value="gpt-5-mini@OpenAI">gpt-5-mini@OpenAI</SelectItem>
                      <SelectItem value="gpt-5-nano@OpenAI">gpt-5-nano@OpenAI</SelectItem>
                      <SelectItem value="o3@OpenAI">o3@OpenAI</SelectItem>
                      <SelectItem value="o4-mini@OpenAI">o4-mini@OpenAI</SelectItem>
                      <SelectItem value="o4-mini-high@OpenAI">o4-mini-high@OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="reasoning">{t('chatAssistants.reasoning')}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.reasoning')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Switch
                          id="reasoning"
                          checked={formData.llm.reasoning}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            llm: { ...formData.llm, reasoning: checked }
                          })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="temperature">{t('chatAssistants.temperature')}: {formData.llm.temperature.toFixed(1)}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.temperature')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="temperature"
                    value={[formData.llm.temperature]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, temperature: value }
                    })}
                    min={0}
                    max={2}
                      step={0.1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="top_p">{t('chatAssistants.topP')}: {formData.llm.top_p.toFixed(1)}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.topP')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="top_p"
                    value={[formData.llm.top_p]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, top_p: value }
                    })}
                    min={0}
                    max={1}
                      step={0.1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="presence_penalty">{t('chatAssistants.presencePenalty')}: {formData.llm.presence_penalty.toFixed(1)}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.presencePenalty')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="presence_penalty"
                    value={[formData.llm.presence_penalty]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, presence_penalty: value }
                    })}
                    min={-2}
                    max={2}
                      step={0.1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="frequency_penalty">{t('chatAssistants.frequencyPenalty')}: {formData.llm.frequency_penalty.toFixed(1)}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.frequencyPenalty')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="frequency_penalty"
                    value={[formData.llm.frequency_penalty]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, frequency_penalty: value }
                    })}
                    min={-2}
                    max={2}
                      step={0.1}
                    />
                    </div>
                  </div>
                </div>

                {/* Prompt Configuration */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">{t('chatAssistants.promptConfiguration')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="similarity_threshold">{t('chatAssistants.similarityThreshold')}: {formData.prompt.similarity_threshold.toFixed(1)}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.similarityThreshold')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="similarity_threshold"
                    value={[formData.prompt.similarity_threshold]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, similarity_threshold: value }
                    })}
                    min={0}
                    max={1}
                      step={0.1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="keywords_similarity_weight">{t('chatAssistants.keywordsSimilarityWeight')}: {formData.prompt.keywords_similarity_weight.toFixed(1)}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.keywordsSimilarityWeight')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="keywords_similarity_weight"
                    value={[formData.prompt.keywords_similarity_weight]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, keywords_similarity_weight: value }
                    })}
                    min={0}
                    max={1}
                      step={0.1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="top_n">{t('chatAssistants.topN')}: {formData.prompt.top_n}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.topN')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="top_n"
                    value={[formData.prompt.top_n]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, top_n: value }
                    })}
                    min={1}
                    max={50}
                      step={1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="top_k">{t('chatAssistants.topK')}: {formData.prompt.top_k}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.topK')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="top_k"
                    value={[formData.prompt.top_k]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, top_k: value }
                    })}
                    min={1}
                    max={2048}
                      step={1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="keyword_analysis">{t('chatAssistants.keywordAnalysis')}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.keywordAnalysis')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                    <Switch
                      id="keyword_analysis"
                      checked={formData.prompt.keyword_analysis}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        prompt: { ...formData.prompt, keyword_analysis: checked }
                      })}
                      />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="show_quote">{t('chatAssistants.showQuote')}</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{t('chatAssistants.tooltips.showQuote')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
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
                      <SelectItem value="true">{t('common.yes')}</SelectItem>
                      <SelectItem value="false">{t('common.no')}</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="cross_languages">{t('chatAssistants.crossLanguages')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('chatAssistants.tooltips.crossLanguages')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                <MultiSelect
                  options={[
                    { value: 'English', label: t('chatAssistants.english') },
                    { value: 'Chinese', label: t('chatAssistants.chinese') },
                    { value: 'Spanish', label: t('chatAssistants.spanish') },
                    { value: 'French', label: t('chatAssistants.french') },
                    { value: 'German', label: t('chatAssistants.german') },
                    { value: 'Japanese', label: t('chatAssistants.japanese') },
                    { value: 'Korean', label: t('chatAssistants.korean') },
                    { value: 'Vietnamese', label: t('chatAssistants.vietnamese') }
                  ]}
                  selected={formData.prompt.cross_languages}
                  onChange={(selected) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, cross_languages: selected }
                  })}
                  placeholder={t('chatAssistants.selectLanguages')}
                  searchPlaceholder={t('chatAssistants.searchLanguages')}
                    emptyMessage={t('chatAssistants.noLanguagesFound')}
                  />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="opener">{t('chatAssistants.opener')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('chatAssistants.tooltips.opener')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                <Input
                  id="opener"
                  value={formData.prompt.opener}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, opener: e.target.value }
                  })}
                    placeholder={t('chatAssistants.openerPlaceholder')}
                  />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="empty_response">{t('chatAssistants.emptyResponse')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('chatAssistants.tooltips.emptyResponse')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                <Input
                  id="empty_response"
                  value={formData.prompt.empty_response}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, empty_response: e.target.value }
                  })}
                    placeholder={t('chatAssistants.emptyResponsePlaceholder')}
                  />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="prompt">{t('chatAssistants.systemPrompt')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('chatAssistants.tooltips.systemPrompt')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                <Textarea
                  id="prompt"
                  value={formData.prompt.prompt}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, prompt: e.target.value }
                  })}
                    placeholder={t('chatAssistants.systemPromptPlaceholder')}
                    rows={4}
                  />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">{t('chatAssistants.createChatAssistant')}</Button>
                </DialogFooter>
              </TooltipProvider>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Chat Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
            <DialogHeader>
              <DialogTitle>{t('chatAssistants.editChatAssistant')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <TooltipProvider>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="edit-name">{t('chatAssistants.name')} *</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('chatAssistants.tooltips.name')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('chatAssistants.namePlaceholder')}
                  required
                />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="edit-description">{t('chatAssistants.description')}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('chatAssistants.tooltips.description')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('chatAssistants.descriptionPlaceholder')}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('chatAssistants.selectAvatar')}</Label>
              <AvatarSelector
                value={formData.avatar}
                  onChange={(base64) => setFormData({ ...formData, avatar: base64 })}
                />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="edit-datasets">{t('chatAssistants.datasetIds')}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('chatAssistants.tooltips.datasetIds')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
              <MultiSelect
                options={datasets.map((dataset) => ({
                  value: dataset.id,
                  label: `${dataset.name} (${dataset.id.substring(0, 8)}...)`
                }))}
                selected={formData.dataset_ids || []}
                onChange={(selected) => setFormData({
                  ...formData,
                  dataset_ids: selected
                })}
                placeholder={t('chatAssistants.selectDatasets')}
                searchPlaceholder={t('chatAssistants.searchDatasets')}
                  emptyMessage={t('chatAssistants.noDatasetsFound')}
                />
                </div>

                {/* LLM Configuration */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">{t('chatAssistants.llmConfiguration')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="edit-model_name">{t('chatAssistants.modelName')}</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{t('chatAssistants.tooltips.modelName')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                  <Select
                    value={formData.llm.model_name || ''}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, model_name: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('chatAssistants.selectModel')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-3.5-turbo@OpenAI">gpt-3.5-turbo@OpenAI</SelectItem>
                      <SelectItem value="gpt-3.5-turbo-16k-0613@OpenAI">gpt-3.5-turbo-16k-0613@OpenAI</SelectItem>
                      <SelectItem value="gpt-4@OpenAI">gpt-4@OpenAI</SelectItem>
                      <SelectItem value="gpt-4-32k@OpenAI">gpt-4-32k@OpenAI</SelectItem>
                      <SelectItem value="gpt-4-turbo@OpenAI">gpt-4-turbo@OpenAI</SelectItem>
                      <SelectItem value="gpt-4.1@OpenAI">gpt-4.1@OpenAI</SelectItem>
                      <SelectItem value="gpt-4.1-mini@OpenAI">gpt-4.1-mini@OpenAI</SelectItem>
                      <SelectItem value="gpt-4.1-nano@OpenAI">gpt-4.1-nano@OpenAI</SelectItem>
                      <SelectItem value="gpt-4.5-preview@OpenAI">gpt-4.5-preview@OpenAI</SelectItem>
                      <SelectItem value="gpt-4o@OpenAI">gpt-4o@OpenAI</SelectItem>
                      <SelectItem value="gpt-4o-mini@OpenAI">gpt-4o-mini@OpenAI</SelectItem>
                      <SelectItem value="gpt-5@OpenAI@OpenAI">gpt-5@OpenAI@OpenAI</SelectItem>
                      <SelectItem value="gpt-5-chat-latest@OpenAI">gpt-5-chat-latest@OpenAI</SelectItem>
                      <SelectItem value="gpt-5-mini@OpenAI">gpt-5-mini@OpenAI</SelectItem>
                      <SelectItem value="gpt-5-nano@OpenAI">gpt-5-nano@OpenAI</SelectItem>
                      <SelectItem value="o3@OpenAI">o3@OpenAI</SelectItem>
                      <SelectItem value="o4-mini@OpenAI">o4-mini@OpenAI</SelectItem>
                      <SelectItem value="o4-mini-high@OpenAI">o4-mini-high@OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit-reasoning">{t('chatAssistants.reasoning')}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.reasoning')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                    <Switch
                      id="edit-reasoning"
                      checked={formData.llm.reasoning || false}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        llm: { ...formData.llm, reasoning: checked }
                      })}
                      />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit-temperature">{t('chatAssistants.temperature')}: {(formData.llm.temperature || 0.1).toFixed(1)}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.temperature')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="edit-temperature"
                    value={[formData.llm.temperature || 0.1]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, temperature: value }
                    })}
                    min={0}
                    max={2}
                      step={0.1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit-top_p">{t('chatAssistants.topP')}: {(formData.llm.top_p || 0.3).toFixed(1)}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.topP')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="edit-top_p"
                    value={[formData.llm.top_p || 0.3]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, top_p: value }
                    })}
                    min={0}
                    max={1}
                      step={0.1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit-presence_penalty">{t('chatAssistants.presencePenalty')}: {(formData.llm.presence_penalty || 0.4).toFixed(1)}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.presencePenalty')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="edit-presence_penalty"
                    value={[formData.llm.presence_penalty || 0.4]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, presence_penalty: value }
                    })}
                    min={-2}
                    max={2}
                      step={0.1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit-frequency_penalty">{t('chatAssistants.frequencyPenalty')}: {(formData.llm.frequency_penalty || 0.7).toFixed(1)}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.frequencyPenalty')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="edit-frequency_penalty"
                    value={[formData.llm.frequency_penalty || 0.7]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      llm: { ...formData.llm, frequency_penalty: value }
                    })}
                    min={-2}
                    max={2}
                    step={0.1}
                  />
                </div>
              </div>
            </div>

                {/* Prompt Configuration */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">{t('chatAssistants.promptConfiguration')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit-similarity_threshold">{t('chatAssistants.similarityThreshold')}: {(formData.prompt.similarity_threshold || 0.2).toFixed(1)}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.similarityThreshold')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="edit-similarity_threshold"
                    value={[formData.prompt.similarity_threshold || 0.2]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, similarity_threshold: value }
                    })}
                    min={0}
                    max={1}
                      step={0.1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit-keywords_similarity_weight">{t('chatAssistants.keywordsSimilarityWeight')}: {(formData.prompt.keywords_similarity_weight || 0.7).toFixed(1)}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.keywordsSimilarityWeight')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="edit-keywords_similarity_weight"
                    value={[formData.prompt.keywords_similarity_weight || 0.7]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, keywords_similarity_weight: value }
                    })}
                    min={0}
                    max={1}
                      step={0.1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit-top_n">{t('chatAssistants.topN')}: {formData.prompt.top_n || 6}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.topN')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="edit-top_n"
                    value={[formData.prompt.top_n || 6]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, top_n: value }
                    })}
                    min={1}
                    max={50}
                      step={1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit-top_k">{t('chatAssistants.topK')}: {formData.prompt.top_k || 1024}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.topK')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  <Slider
                    id="edit-top_k"
                    value={[formData.prompt.top_k || 1024]}
                    onValueChange={([value]) => setFormData({
                      ...formData,
                      prompt: { ...formData.prompt, top_k: value }
                    })}
                    min={1}
                    max={2048}
                      step={1}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit-keyword_analysis">{t('chatAssistants.keywordAnalysis')}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('chatAssistants.tooltips.keywordAnalysis')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Switch
                      id="edit-keyword_analysis"
                      checked={formData.prompt.keyword_analysis || false}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        prompt: { ...formData.prompt, keyword_analysis: checked }
                        })}
                      />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="edit-show_quote">{t('chatAssistants.showQuote')}</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{t('chatAssistants.tooltips.showQuote')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
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
                      <SelectItem value="true">{t('common.yes')}</SelectItem>
                      <SelectItem value="false">{t('common.no')}</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="edit-cross_languages">{t('chatAssistants.crossLanguages')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('chatAssistants.tooltips.crossLanguages')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                <MultiSelect
                  options={[
                    { value: 'English', label: t('chatAssistants.english') },
                    { value: 'Chinese', label: t('chatAssistants.chinese') },
                    { value: 'Spanish', label: t('chatAssistants.spanish') },
                    { value: 'French', label: t('chatAssistants.french') },
                    { value: 'German', label: t('chatAssistants.german') },
                    { value: 'Japanese', label: t('chatAssistants.japanese') },
                    { value: 'Korean', label: t('chatAssistants.korean') },
                    { value: 'Vietnamese', label: t('chatAssistants.vietnamese') }
                  ]}
                  selected={formData.prompt.cross_languages || []}
                  onChange={(selected) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, cross_languages: selected }
                  })}
                  placeholder={t('chatAssistants.selectLanguages')}
                  searchPlaceholder={t('chatAssistants.searchLanguages')}
                    emptyMessage={t('chatAssistants.noLanguagesFound')}
                  />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="edit-opener">{t('chatAssistants.opener')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('chatAssistants.tooltips.opener')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                <Input
                  id="edit-opener"
                  value={formData.prompt.opener || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, opener: e.target.value }
                  })}
                    placeholder={t('chatAssistants.openerPlaceholder')}
                  />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="edit-empty_response">{t('chatAssistants.emptyResponse')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('chatAssistants.tooltips.emptyResponse')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                <Input
                  id="edit-empty_response"
                  value={formData.prompt.empty_response || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, empty_response: e.target.value }
                  })}
                    placeholder={t('chatAssistants.emptyResponsePlaceholder')}
                  />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="edit-prompt">{t('chatAssistants.systemPrompt')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('chatAssistants.tooltips.systemPrompt')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                <Textarea
                  id="edit-prompt"
                  value={formData.prompt.prompt || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompt: { ...formData.prompt, prompt: e.target.value }
                  })}
                    placeholder={t('chatAssistants.systemPromptPlaceholder')}
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
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">{t('chatAssistants.updateChatAssistant')}</Button>
                </DialogFooter>
              </TooltipProvider>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('chatAssistants.deleteChatAssistant')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('chatAssistants.deleteConfirm', { name: selectedChat?.name })}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedChat(null);
            }}>
              {t('common.cancel')}
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('chatAssistants.deleteChatAssistants')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('chatAssistants.bulkDeleteConfirm', { count: selectedChats.length })}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setBulkDeleteDialogOpen(false);
            }}>
              {t('common.cancel')}
            </Button>
            <Button type="button" variant="destructive" onClick={handleBulkDelete}>
              {t('chatAssistants.deleteChats', { count: selectedChats.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

