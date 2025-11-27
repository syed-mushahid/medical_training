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
import { Plus, RefreshCw, Edit, Trash2, Network, Eye, Search, FolderOpen, Info } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import Loading from '../components/Loading';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

export default function RAGFlow() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [knowledgeGraphDialogOpen, setKnowledgeGraphDialogOpen] = useState(false);
  const [deleteKnowledgeGraphDialogOpen, setDeleteKnowledgeGraphDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const [knowledgeGraph, setKnowledgeGraph] = useState(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
    description: '',
    embedding_model: '',
    permission: 'me',
    chunk_method: 'naive',
    parser_config: {
      chunk_token_num: 512,
      delimiter: '\n',
      html4excel: false,
      layout_recognize: 'DeepDOC',
      auto_keywords: 0,
      auto_questions: 0,
      task_page_size: 12,
      raptor: { use_raptor: false },
      graphrag: { use_graphrag: false },
    },
  });
  const [errors, setErrors] = useState({});
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ragflow/datasets');
      if (response.data.success) {
        setDatasets(response.data.datasets || []);
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('ragflow.failedToFetch'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('ragflow.failedToFetch'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate name (required, max 128 chars)
    if (!formData.name.trim()) {
      newErrors.name = 'Dataset name is required';
    } else if (formData.name.length > 128) {
      newErrors.name = 'Dataset name must be 128 characters or less';
    }

    // Validate avatar (max 65535 chars if provided)
    if (formData.avatar && formData.avatar.length > 65535) {
      newErrors.avatar = 'Avatar base64 string must be 65535 characters or less';
    }

    // Validate description (max 65535 chars if provided)
    if (formData.description && formData.description.length > 65535) {
      newErrors.description = 'Description must be 65535 characters or less';
    }

    // Validate embedding_model (max 255 chars, must contain @)
    if (formData.embedding_model) {
      if (formData.embedding_model.length > 255) {
        newErrors.embedding_model = 'Embedding model name must be 255 characters or less';
      } else if (!formData.embedding_model.includes('@')) {
        newErrors.embedding_model = 'Must follow model_name@model_factory format';
      }
    }

    // Validate parser_config for naive chunk_method
    if (formData.chunk_method === 'naive') {
      const pc = formData.parser_config;
      
      if (pc.auto_keywords !== undefined) {
        const val = parseInt(pc.auto_keywords);
        if (isNaN(val) || val < 0 || val > 32) {
          newErrors.auto_keywords = 'Must be between 0 and 32';
        }
      }

      if (pc.auto_questions !== undefined) {
        const val = parseInt(pc.auto_questions);
        if (isNaN(val) || val < 0 || val > 10) {
          newErrors.auto_questions = 'Must be between 0 and 10';
        }
      }

      if (pc.chunk_token_num !== undefined) {
        const val = parseInt(pc.chunk_token_num);
        if (isNaN(val) || val < 1 || val > 2048) {
          newErrors.chunk_token_num = 'Must be between 1 and 2048';
        }
      }

      if (pc.task_page_size !== undefined) {
        const val = parseInt(pc.task_page_size);
        if (isNaN(val) || val < 1) {
          newErrors.task_page_size = 'Must be 1 or greater';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Prepare request body
      const requestBody = {
        name: formData.name.trim(),
      };

      if (formData.avatar) requestBody.avatar = formData.avatar;
      if (formData.description) requestBody.description = formData.description;
      if (formData.embedding_model) requestBody.embedding_model = formData.embedding_model;
      if (formData.permission) requestBody.permission = formData.permission;
      if (formData.chunk_method) requestBody.chunk_method = formData.chunk_method;

      // Add parser_config if chunk_method is naive
      if (formData.chunk_method === 'naive') {
        const pc = { ...formData.parser_config };
        // Convert string numbers to integers
        if (pc.chunk_token_num !== undefined) pc.chunk_token_num = parseInt(pc.chunk_token_num) || 512;
        if (pc.auto_keywords !== undefined) pc.auto_keywords = parseInt(pc.auto_keywords) || 0;
        if (pc.auto_questions !== undefined) pc.auto_questions = parseInt(pc.auto_questions) || 0;
        if (pc.task_page_size !== undefined) pc.task_page_size = parseInt(pc.task_page_size) || 12;
        if (pc.html4excel !== undefined) pc.html4excel = pc.html4excel === true || pc.html4excel === 'true';
        
        requestBody.parser_config = pc;
      } else if (['qa', 'manual', 'paper', 'book', 'laws', 'presentation'].includes(formData.chunk_method)) {
        // These methods only need raptor config
        requestBody.parser_config = {
          raptor: formData.parser_config.raptor || { use_raptor: false }
        };
      } else if (['table', 'picture', 'one', 'email'].includes(formData.chunk_method)) {
        // Empty parser_config
        requestBody.parser_config = {};
      }

      const response = await api.post('/ragflow/datasets', requestBody);
      
      if (response.data.success) {
        toast({
          title: t('toast.success'),
          description: t('ragflow.datasetCreated'),
        });
        setDialogOpen(false);
        resetForm();
        fetchDatasets();
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('ragflow.failedToCreate'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('ragflow.failedToCreate'),
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      avatar: '',
      description: '',
      embedding_model: '',
      permission: 'me',
      chunk_method: 'naive',
      pagerank: 0,
      parser_config: {
        chunk_token_num: 512,
        delimiter: '\n',
        html4excel: false,
        layout_recognize: 'DeepDOC',
        auto_keywords: 0,
        auto_questions: 0,
        task_page_size: 12,
        raptor: { use_raptor: false },
        graphrag: { use_graphrag: false },
      },
    });
    setErrors({});
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleUpdateDataset = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    try {
      const requestBody = {};

      if (formData.name) requestBody.name = formData.name.trim();
      if (formData.description !== undefined) requestBody.description = formData.description;
      if (formData.embedding_model) requestBody.embedding_model = formData.embedding_model;
      if (formData.permission) requestBody.permission = formData.permission;
      if (formData.chunk_method) requestBody.chunk_method = formData.chunk_method;
      if (formData.pagerank !== undefined) requestBody.pagerank = parseInt(formData.pagerank) || 0;

      // Add parser_config if chunk_method is naive
      if (formData.chunk_method === 'naive') {
        const pc = { ...formData.parser_config };
        if (pc.chunk_token_num !== undefined) pc.chunk_token_num = parseInt(pc.chunk_token_num) || 512;
        if (pc.auto_keywords !== undefined) pc.auto_keywords = parseInt(pc.auto_keywords) || 0;
        if (pc.auto_questions !== undefined) pc.auto_questions = parseInt(pc.auto_questions) || 0;
        if (pc.task_page_size !== undefined) pc.task_page_size = parseInt(pc.task_page_size) || 12;
        if (pc.html4excel !== undefined) pc.html4excel = pc.html4excel === true || pc.html4excel === 'true';
        requestBody.parser_config = pc;
      } else if (['qa', 'manual', 'paper', 'book', 'laws', 'presentation'].includes(formData.chunk_method)) {
        requestBody.parser_config = {
          raptor: formData.parser_config.raptor || { use_raptor: false }
        };
      } else if (['table', 'picture', 'one', 'email'].includes(formData.chunk_method)) {
        requestBody.parser_config = {};
      }

      const response = await api.put(`/ragflow/datasets/${selectedDataset.id}`, requestBody);
      
      if (response.data.success) {
        toast({
          title: t('toast.success'),
          description: t('ragflow.datasetUpdated'),
        });
        setEditDialogOpen(false);
        setSelectedDataset(null);
        resetForm();
        fetchDatasets();
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('ragflow.failedToUpdate'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('ragflow.failedToUpdate'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDataset = async () => {
    try {
      let idsToDelete = [];
      
      if (selectedDataset) {
        // Delete single dataset
        idsToDelete = [selectedDataset.id];
      } else if (selectedDatasets.length > 0) {
        // Delete selected datasets
        idsToDelete = selectedDatasets;
      } else {
        toast({
          title: t('toast.error'),
          description: t('ragflow.selectToDelete'),
          variant: 'destructive',
        });
        return;
      }

      const response = await api.delete('/ragflow/datasets', {
        data: { ids: idsToDelete }
      });
      
      if (response.data.success) {
        toast({
          title: t('toast.success'),
          description: t('ragflow.datasetsDeleted'),
        });
        setDeleteDialogOpen(false);
        setSelectedDataset(null);
        setSelectedDatasets([]);
        fetchDatasets();
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('ragflow.failedToDelete'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('ragflow.failedToDelete'),
        variant: 'destructive',
      });
    }
  };

  const handleParserConfigChange = (field, value) => {
    setFormData({
      ...formData,
      parser_config: {
        ...formData.parser_config,
        [field]: value,
      },
    });
    // Clear error for this field
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center py-2">
        <div>
          <h1 className="text-2xl font-bold">{t('ragflow.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('ragflow.subtitle')}</p>
        </div>
        <div className="flex space-x-2">
          {/* Temporarily hidden - Chunk Retrieval button */}
          {/* <Button variant="outline" onClick={() => navigate('/ragflow/retrieval')}>
            <Search className="h-4 w-4 mr-2" />
            {t('ragflow.chunkRetrieval')}
          </Button> */}
          <Button variant="outline" onClick={fetchDatasets}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
          {selectedDatasets.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => {
                setSelectedDataset(null);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('ragflow.deleteSelected')} ({selectedDatasets.length})
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('ragflow.createDataset')}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDatasets(datasets.map(d => d.id));
                        } else {
                          setSelectedDatasets([]);
                        }
                      }}
                      checked={selectedDatasets.length === datasets.length && datasets.length > 0}
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">{t('common.name')}</TableHead>
                  <TableHead className="font-semibold">{t('common.description')}</TableHead>
                  <TableHead className="font-semibold">{t('ragflow.chunkMethod')}</TableHead>
                  <TableHead className="font-semibold">{t('ragflow.embeddingModel')}</TableHead>
                  <TableHead className="font-semibold text-center">{t('ragflow.documents')}</TableHead>
                  <TableHead className="font-semibold text-center">{t('ragflow.chunks')}</TableHead>
                  <TableHead className="font-semibold text-center">{t('common.status')}</TableHead>
                  <TableHead className="text-right font-semibold">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {datasets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    {t('ragflow.noDatasetsFound')}
                  </TableCell>
                </TableRow>
              ) : (
                datasets.map((dataset) => (
                  <TableRow key={dataset.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedDatasets.includes(dataset.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDatasets([...selectedDatasets, dataset.id]);
                          } else {
                            setSelectedDatasets(selectedDatasets.filter(id => id !== dataset.id));
                          }
                        }}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-medium py-4">{dataset.name}</TableCell>
                    <TableCell className="max-w-xs truncate" title={dataset.description || '-'}>
                      {dataset.description || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {dataset.chunk_method ? (
                        <Badge variant="outline" className="font-normal">
                          {dataset.chunk_method}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-xs" title={dataset.embedding_model || '-'}>
                      {dataset.embedding_model || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-semibold">
                        {dataset.document_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-semibold">
                        {dataset.chunk_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={dataset.status === '1' ? 'default' : 'secondary'}
                        className={dataset.status === '1' ? 'bg-green-500 hover:bg-green-600' : ''}
                      >
                        {dataset.status === '1' ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigate(`/ragflow/datasets/${dataset.id}/documents`);
                          }}
                          title={t('ragflow.manageDocuments')}
                          className="h-8 w-8"
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                        {/* Temporarily hidden - Knowledge Graph button */}
                        {/* <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            setSelectedDataset(dataset);
                            setLoadingGraph(true);
                            try {
                              const response = await api.get(`/ragflow/datasets/${dataset.id}/knowledge_graph`);
                              if (response.data.success) {
                                setKnowledgeGraph(response.data.knowledge_graph);
                                setKnowledgeGraphDialogOpen(true);
                              } else {
                                toast({
                                  title: t('toast.error'),
                                  description: response.data.error || t('ragflow.failedToFetchGraph'),
                                  variant: 'destructive',
                                });
                              }
                            } catch (error) {
                              toast({
                                title: t('toast.error'),
                                description: error.response?.data?.error || t('ragflow.failedToFetchGraph'),
                                variant: 'destructive',
                              });
                            } finally {
                              setLoadingGraph(false);
                            }
                          }}
                          title={t('ragflow.viewKnowledgeGraph')}
                        >
                          <Network className="h-4 w-4" />
                        </Button> */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedDataset(dataset);
                            setFormData({
                              name: dataset.name || '',
                              avatar: '',
                              description: dataset.description || '',
                              embedding_model: dataset.embedding_model || '',
                              permission: dataset.permission || 'me',
                              chunk_method: dataset.chunk_method || 'naive',
                              pagerank: dataset.pagerank || 0,
                              parser_config: dataset.parser_config || {
                                chunk_token_num: 512,
                                delimiter: '\n',
                                html4excel: false,
                                layout_recognize: 'DeepDOC',
                                auto_keywords: 0,
                                auto_questions: 0,
                                task_page_size: 12,
                                raptor: { use_raptor: false },
                                graphrag: { use_graphrag: false },
                              },
                            });
                            setEditDialogOpen(true);
                          }}
                          title={t('ragflow.editDataset')}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedDataset(dataset);
                            setDeleteDialogOpen(true);
                          }}
                          title={t('ragflow.deleteDataset')}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
            <DialogHeader>
              <DialogTitle>{t('ragflow.createDataset')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
            <TooltipProvider>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="name">{t('ragflow.datasetName')} *</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{t('ragflow.tooltips.datasetName')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) {
                      const newErrors = { ...errors };
                      delete newErrors.name;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder={t('ragflow.datasetNamePlaceholder')}
                  required
                  maxLength={128}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                <p className="text-xs text-muted-foreground">
                  {t('ragflow.datasetNameDesc')}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="description">{t('common.description')}</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{t('ragflow.tooltips.description')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (errors.description) {
                      const newErrors = { ...errors };
                      delete newErrors.description;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder={t('ragflow.descriptionPlaceholder')}
                  maxLength={65535}
                  rows={3}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                <p className="text-xs text-muted-foreground">
                  Max 65535 characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="embedding_model">{t('ragflow.embeddingModel')}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('ragflow.tooltips.embeddingModel')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={formData.embedding_model}
                    onValueChange={(value) => {
                      setFormData({ ...formData, embedding_model: value });
                      if (errors.embedding_model) {
                        const newErrors = { ...errors };
                        delete newErrors.embedding_model;
                        setErrors(newErrors);
                      }
                    }}
                  >
                    <SelectTrigger id="embedding_model">
                      <SelectValue placeholder={t('ragflow.embeddingModelPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text-embedding-3-large@OpenAI">text-embedding-3-large@OpenAI</SelectItem>
                      <SelectItem value="text-embedding-3-small@OpenAI">text-embedding-3-small@OpenAI</SelectItem>
                      <SelectItem value="text-embedding-ada-002@OpenAI">text-embedding-ada-002@OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.embedding_model && <p className="text-sm text-destructive">{errors.embedding_model}</p>}
                  <p className="text-xs text-muted-foreground">
                    {t('ragflow.embeddingModelDesc')}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="permission">{t('ragflow.permission')}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('ragflow.tooltips.permission')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={formData.permission}
                    onValueChange={(value) => setFormData({ ...formData, permission: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="me">{t('ragflow.permissionMe')}</SelectItem>
                      <SelectItem value="team">{t('ragflow.permissionTeam')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="chunk_method">{t('ragflow.chunkMethod')}</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{t('ragflow.tooltips.chunkMethod')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={formData.chunk_method}
                  onValueChange={(value) => setFormData({ ...formData, chunk_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="naive">{t('ragflow.chunkMethodNaive')}</SelectItem>
                    <SelectItem value="book">{t('ragflow.chunkMethodBook')}</SelectItem>
                    <SelectItem value="email">{t('ragflow.chunkMethodEmail')}</SelectItem>
                    <SelectItem value="laws">{t('ragflow.chunkMethodLaws')}</SelectItem>
                    <SelectItem value="manual">{t('ragflow.chunkMethodManual')}</SelectItem>
                    <SelectItem value="one">{t('ragflow.chunkMethodOne')}</SelectItem>
                    <SelectItem value="paper">{t('ragflow.chunkMethodPaper')}</SelectItem>
                    <SelectItem value="picture">{t('ragflow.chunkMethodPicture')}</SelectItem>
                    <SelectItem value="presentation">{t('ragflow.chunkMethodPresentation')}</SelectItem>
                    <SelectItem value="qa">{t('ragflow.chunkMethodQa')}</SelectItem>
                    <SelectItem value="table">{t('ragflow.chunkMethodTable')}</SelectItem>
                    <SelectItem value="tag">{t('ragflow.chunkMethodTag')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            {/* Parser Config for Naive chunk method */}
            {formData.chunk_method === 'naive' && (
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="font-semibold">{t('ragflow.parserConfig')}</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="chunk_token_num">{t('ragflow.chunkTokenNum')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('ragflow.tooltips.chunkTokenNum')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="chunk_token_num"
                      type="number"
                      min="1"
                      max="2048"
                      value={formData.parser_config.chunk_token_num}
                      onChange={(e) => handleParserConfigChange('chunk_token_num', e.target.value)}
                    />
                    {errors.chunk_token_num && <p className="text-sm text-destructive">{errors.chunk_token_num}</p>}
                    <p className="text-xs text-muted-foreground">{t('ragflow.chunkTokenNumDesc')}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="delimiter">{t('ragflow.delimiter')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('ragflow.tooltips.delimiter')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="delimiter"
                      value={formData.parser_config.delimiter || '\n'}
                      onChange={(e) => handleParserConfigChange('delimiter', e.target.value)}
                      placeholder="\n"
                    />
                    <p className="text-xs text-muted-foreground">{t('ragflow.delimiterDesc')}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="auto_keywords">{t('ragflow.autoKeywords')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('ragflow.tooltips.autoKeywords')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="auto_keywords"
                      type="number"
                      min="0"
                      max="32"
                      value={formData.parser_config.auto_keywords}
                      onChange={(e) => handleParserConfigChange('auto_keywords', e.target.value)}
                    />
                    {errors.auto_keywords && <p className="text-sm text-destructive">{errors.auto_keywords}</p>}
                    <p className="text-xs text-muted-foreground">{t('ragflow.autoKeywordsDesc')}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="auto_questions">{t('ragflow.autoQuestions')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('ragflow.tooltips.autoQuestions')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="auto_questions"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.parser_config.auto_questions}
                      onChange={(e) => handleParserConfigChange('auto_questions', e.target.value)}
                    />
                    {errors.auto_questions && <p className="text-sm text-destructive">{errors.auto_questions}</p>}
                    <p className="text-xs text-muted-foreground">{t('ragflow.autoQuestionsDesc')}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="task_page_size">{t('ragflow.taskPageSize')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('ragflow.tooltips.taskPageSize')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="task_page_size"
                      type="number"
                      min="1"
                      value={formData.parser_config.task_page_size}
                      onChange={(e) => handleParserConfigChange('task_page_size', e.target.value)}
                    />
                    {errors.task_page_size && <p className="text-sm text-destructive">{errors.task_page_size}</p>}
                    <p className="text-xs text-muted-foreground">{t('ragflow.taskPageSizeDesc')}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="layout_recognize">{t('ragflow.layoutRecognize')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('ragflow.tooltips.layoutRecognize')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={formData.parser_config.layout_recognize || 'DeepDOC'}
                      onValueChange={(value) => handleParserConfigChange('layout_recognize', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DeepDOC">DeepDOC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="html4excel"
                    checked={formData.parser_config.html4excel || false}
                    onChange={(e) => handleParserConfigChange('html4excel', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <div className="flex items-center gap-2">
                    <Label htmlFor="html4excel" className="cursor-pointer">
                      {t('ragflow.html4excel')}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('ragflow.tooltips.html4excel')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit">{t('ragflow.createDataset')}</Button>
              </DialogFooter>
            </TooltipProvider>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dataset Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
            <DialogHeader>
              <DialogTitle>{t('ragflow.editDataset')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateDataset} className="space-y-4">
              <TooltipProvider>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="edit_name">{t('ragflow.datasetName')} *</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('ragflow.tooltips.datasetName')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) {
                    const newErrors = { ...errors };
                    delete newErrors.name;
                    setErrors(newErrors);
                  }
                }}
                  placeholder={t('ragflow.datasetNamePlaceholder')}
                  required
                  maxLength={128}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                <p className="text-xs text-muted-foreground">
                  {t('ragflow.datasetNameDesc')}
                </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="edit_description">{t('common.description')}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('ragflow.tooltips.description')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (errors.description) {
                    const newErrors = { ...errors };
                    delete newErrors.description;
                    setErrors(newErrors);
                  }
                }}
                  placeholder={t('ragflow.descriptionPlaceholder')}
                  maxLength={65535}
                  rows={3}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="edit_embedding_model">{t('ragflow.embeddingModel')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('ragflow.tooltips.embeddingModel')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                <Select
                  value={formData.embedding_model}
                  onValueChange={(value) => {
                    setFormData({ ...formData, embedding_model: value });
                    if (errors.embedding_model) {
                      const newErrors = { ...errors };
                      delete newErrors.embedding_model;
                      setErrors(newErrors);
                    }
                  }}
                >
                    <SelectTrigger id="edit_embedding_model">
                      <SelectValue placeholder={t('ragflow.embeddingModelPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text-embedding-3-large@OpenAI">text-embedding-3-large@OpenAI</SelectItem>
                      <SelectItem value="text-embedding-3-small@OpenAI">text-embedding-3-small@OpenAI</SelectItem>
                      <SelectItem value="text-embedding-ada-002@OpenAI">text-embedding-ada-002@OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.embedding_model && <p className="text-sm text-destructive">{errors.embedding_model}</p>}
                  <p className="text-xs text-muted-foreground">
                    {t('ragflow.embeddingModelDesc')}
                  </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="edit_permission">{t('ragflow.permission')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('ragflow.tooltips.permission')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                <Select
                  value={formData.permission}
                  onValueChange={(value) => setFormData({ ...formData, permission: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="me">{t('ragflow.permissionMe')}</SelectItem>
                      <SelectItem value="team">{t('ragflow.permissionTeam')}</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="edit_chunk_method">{t('ragflow.chunkMethod')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('ragflow.tooltips.chunkMethod')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                <Select
                  value={formData.chunk_method}
                  onValueChange={(value) => setFormData({ ...formData, chunk_method: value })}
                >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="naive">{t('ragflow.chunkMethodNaive')}</SelectItem>
                      <SelectItem value="book">{t('ragflow.chunkMethodBook')}</SelectItem>
                      <SelectItem value="email">{t('ragflow.chunkMethodEmail')}</SelectItem>
                      <SelectItem value="laws">{t('ragflow.chunkMethodLaws')}</SelectItem>
                      <SelectItem value="manual">{t('ragflow.chunkMethodManual')}</SelectItem>
                      <SelectItem value="one">{t('ragflow.chunkMethodOne')}</SelectItem>
                      <SelectItem value="paper">{t('ragflow.chunkMethodPaper')}</SelectItem>
                      <SelectItem value="picture">{t('ragflow.chunkMethodPicture')}</SelectItem>
                      <SelectItem value="presentation">{t('ragflow.chunkMethodPresentation')}</SelectItem>
                      <SelectItem value="qa">{t('ragflow.chunkMethodQa')}</SelectItem>
                      <SelectItem value="table">{t('ragflow.chunkMethodTable')}</SelectItem>
                      <SelectItem value="tag">{t('ragflow.chunkMethodTag')}</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_pagerank">{t('ragflow.pageRank')}</Label>
                    <Input
                      id="edit_pagerank"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.pagerank || 0}
                      onChange={(e) => setFormData({ ...formData, pagerank: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">{t('ragflow.pageRankRange')}</p>
                  </div>
                </div>

                {/* Parser Config for Naive chunk method */}
                {formData.chunk_method === 'naive' && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <h3 className="font-semibold">{t('ragflow.parserConfig')}</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit_chunk_token_num">{t('ragflow.chunkTokenNum')}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('ragflow.tooltips.chunkTokenNum')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="edit_chunk_token_num"
                          type="number"
                          min="1"
                          max="2048"
                          value={formData.parser_config.chunk_token_num}
                          onChange={(e) => handleParserConfigChange('chunk_token_num', e.target.value)}
                        />
                        {errors.chunk_token_num && <p className="text-sm text-destructive">{errors.chunk_token_num}</p>}
                        <p className="text-xs text-muted-foreground">{t('ragflow.chunkTokenNumDesc')}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit_delimiter">{t('ragflow.delimiter')}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('ragflow.tooltips.delimiter')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="edit_delimiter"
                          value={formData.parser_config.delimiter || '\n'}
                          onChange={(e) => handleParserConfigChange('delimiter', e.target.value)}
                          placeholder="\n"
                        />
                        <p className="text-xs text-muted-foreground">{t('ragflow.delimiterDesc')}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit_auto_keywords">{t('ragflow.autoKeywords')}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('ragflow.tooltips.autoKeywords')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="edit_auto_keywords"
                          type="number"
                          min="0"
                          max="32"
                          value={formData.parser_config.auto_keywords}
                          onChange={(e) => handleParserConfigChange('auto_keywords', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">{t('ragflow.autoKeywordsDesc')}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit_auto_questions">{t('ragflow.autoQuestions')}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('ragflow.tooltips.autoQuestions')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="edit_auto_questions"
                          type="number"
                          min="0"
                          max="10"
                          value={formData.parser_config.auto_questions}
                          onChange={(e) => handleParserConfigChange('auto_questions', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">{t('ragflow.autoQuestionsDesc')}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit_task_page_size">{t('ragflow.taskPageSize')}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('ragflow.tooltips.taskPageSize')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="edit_task_page_size"
                          type="number"
                          min="1"
                          value={formData.parser_config.task_page_size}
                          onChange={(e) => handleParserConfigChange('task_page_size', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">{t('ragflow.taskPageSizeDesc')}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit_layout_recognize">{t('ragflow.layoutRecognize')}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('ragflow.tooltips.layoutRecognize')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Select
                          value={formData.parser_config.layout_recognize || 'DeepDOC'}
                          onValueChange={(value) => handleParserConfigChange('layout_recognize', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DeepDOC">DeepDOC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="edit_html4excel"
                        checked={formData.parser_config.html4excel || false}
                        onChange={(e) => handleParserConfigChange('html4excel', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <div className="flex items-center gap-2">
                        <Label htmlFor="edit_html4excel" className="cursor-pointer">
                          {t('ragflow.html4excel')}
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{t('ragflow.tooltips.html4excel')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">{t('ragflow.editDataset')}</Button>
                </DialogFooter>
              </TooltipProvider>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dataset Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ragflow.deleteDataset')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              {t('ragflow.deleteConfirm')} <strong>{selectedDataset?.name}</strong>?
            </p>
            {selectedDatasets.length > 0 && !selectedDataset && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  {selectedDatasets.length} {t('ragflow.deleteConfirmMultiple')}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedDataset(null);
              }}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteDataset}
              >
                {t('common.delete')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Knowledge Graph Dialog */}
      <Dialog open={knowledgeGraphDialogOpen} onOpenChange={setKnowledgeGraphDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Knowledge Graph - {selectedDataset?.name}
              <Button
                variant="destructive"
                size="sm"
                className="ml-4"
                onClick={() => {
                  setKnowledgeGraphDialogOpen(false);
                  setDeleteKnowledgeGraphDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Graph
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loadingGraph ? (
              <div className="text-center py-8">Loading knowledge graph...</div>
            ) : knowledgeGraph ? (
              <>
                {knowledgeGraph.graph && (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Graph Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Directed:</span>{' '}
                          {knowledgeGraph.graph.directed !== undefined 
                            ? (knowledgeGraph.graph.directed ? 'Yes' : 'No')
                            : (knowledgeGraph.graph.graph?.directed ? 'Yes' : 'No')}
                        </div>
                        <div>
                          <span className="font-medium">Multigraph:</span>{' '}
                          {knowledgeGraph.graph.multigraph !== undefined
                            ? (knowledgeGraph.graph.multigraph ? 'Yes' : 'No')
                            : (knowledgeGraph.graph.graph?.multigraph ? 'Yes' : 'No')}
                        </div>
                      </div>
                    </div>

                    {knowledgeGraph.graph.nodes && knowledgeGraph.graph.nodes.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-3">Nodes ({knowledgeGraph.graph.nodes.length})</h3>
                        <div className="max-h-64 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Entity Name</TableHead>
                                <TableHead>Entity Type</TableHead>
                                <TableHead>PageRank</TableHead>
                                <TableHead>Rank</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {knowledgeGraph.graph.nodes.map((node, index) => (
                                <TableRow key={node.id || index}>
                                  <TableCell className="font-medium">{node.entity_name || '-'}</TableCell>
                                  <TableCell>{node.entity_type || '-'}</TableCell>
                                  <TableCell>{node.pagerank?.toFixed(4) || '-'}</TableCell>
                                  <TableCell>{node.rank || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {knowledgeGraph.graph.edges && knowledgeGraph.graph.edges.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-3">Edges ({knowledgeGraph.graph.edges.length})</h3>
                        <div className="max-h-64 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Source</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Weight</TableHead>
                                <TableHead>Description</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {knowledgeGraph.graph.edges.map((edge, index) => (
                                <TableRow key={index}>
                                  <TableCell>{edge.source || '-'}</TableCell>
                                  <TableCell>{edge.target || '-'}</TableCell>
                                  <TableCell>{edge.weight || '-'}</TableCell>
                                  <TableCell className="max-w-xs truncate" title={edge.description}>
                                    {edge.description || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {(!knowledgeGraph.graph.nodes || knowledgeGraph.graph.nodes.length === 0) &&
                     (!knowledgeGraph.graph.edges || knowledgeGraph.graph.edges.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        No knowledge graph data available
                      </div>
                    )}
                  </div>
                )}

                {knowledgeGraph.mind_map && Object.keys(knowledgeGraph.mind_map).length > 0 && (
                  <div className="border rounded-lg p-4 mt-4">
                    <h3 className="font-semibold mb-3">Mind Map</h3>
                    <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(knowledgeGraph.mind_map, null, 2)}
                    </pre>
                  </div>
                )}

                {!knowledgeGraph.graph && !knowledgeGraph.mind_map && (
                  <div className="text-center py-8 text-muted-foreground">
                    No knowledge graph data available
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No knowledge graph data available
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setKnowledgeGraphDialogOpen(false);
              setKnowledgeGraph(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Knowledge Graph Dialog */}
      <Dialog open={deleteKnowledgeGraphDialogOpen} onOpenChange={setDeleteKnowledgeGraphDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Knowledge Graph</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to delete the knowledge graph for <strong>{selectedDataset?.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The knowledge graph will need to be regenerated.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setDeleteKnowledgeGraphDialogOpen(false);
              }}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  try {
                    const response = await api.delete(`/ragflow/datasets/${selectedDataset.id}/knowledge_graph`);
                    if (response.data.success) {
                      toast({
                        title: 'Success',
                        description: 'Knowledge graph deleted successfully',
                      });
                      setDeleteKnowledgeGraphDialogOpen(false);
                      setKnowledgeGraphDialogOpen(false);
                      setKnowledgeGraph(null);
                    } else {
                      toast({
                        title: 'Error',
                        description: response.data.error || 'Failed to delete knowledge graph',
                        variant: 'destructive',
                      });
                    }
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: error.response?.data?.error || 'Failed to delete knowledge graph',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

