import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { getApiUrl } from '../config';
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
import { ArrowLeft, Plus, RefreshCw, Edit, Download, Trash2, Upload, Play, Square, FileText } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import Loading from '../components/Loading';
import { useTranslation } from 'react-i18next';

export default function DatasetDocuments() {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [parseDialogOpen, setParseDialogOpen] = useState(false);
  const [stopParseDialogOpen, setStopParseDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    chunk_method: 'naive',
    parser_config: {
      chunk_token_num: 256,
      layout_recognize: true,
      html4excel: false,
      delimiter: '\n',
      task_page_size: 12,
      raptor: { use_raptor: false },
    },
  });
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchDocuments();
  }, [datasetId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/ragflow/datasets/${datasetId}/documents`);
      if (response.data.success) {
        setDocuments(response.data.documents || []);
        setTotal(response.data.total || 0);
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('documents.failedToFetch'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('documents.failedToFetch'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: t('toast.error'),
        description: t('documents.selectAtLeastOneFile'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('file', file);
      });

      const response = await api.post(
        `/ragflow/datasets/${datasetId}/documents`,
        formData
      );

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Documents uploaded successfully',
        });
        setUploadDialogOpen(false);
        setSelectedFiles([]);
        fetchDocuments();
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to upload documents',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to upload documents',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (doc) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        getApiUrl(`/ragflow/datasets/${datasetId}/documents/${doc.id}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to download document');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name || 'document');
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Document downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (doc) => {
    setSelectedDocument(doc);
    setFormData({
      name: doc.name || '',
      chunk_method: doc.chunk_method || 'naive',
      parser_config: doc.parser_config || {
        chunk_token_num: 256,
        layout_recognize: true,
        html4excel: false,
        delimiter: '\n',
        task_page_size: 12,
        raptor: { use_raptor: false },
      },
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const requestBody = {
        name: formData.name,
        chunk_method: formData.chunk_method,
      };

      // Add parser_config based on chunk_method
      if (formData.chunk_method === 'naive') {
        const pc = { ...formData.parser_config };
        if (pc.chunk_token_num !== undefined) pc.chunk_token_num = parseInt(pc.chunk_token_num) || 256;
        if (pc.task_page_size !== undefined) pc.task_page_size = parseInt(pc.task_page_size) || 12;
        requestBody.parser_config = pc;
      } else if (['qa', 'manual', 'paper', 'book', 'laws', 'presentation'].includes(formData.chunk_method)) {
        requestBody.parser_config = {
          raptor: formData.parser_config.raptor || { use_raptor: false }
        };
      } else if (['table', 'picture', 'one', 'email'].includes(formData.chunk_method)) {
        requestBody.parser_config = {};
      }

      const response = await api.put(
        `/ragflow/datasets/${datasetId}/documents/${selectedDocument.id}`,
        requestBody
      );

      if (response.data.success) {
        toast({
          title: t('toast.success'),
          description: t('documents.documentUpdated'),
        });
        setEditDialogOpen(false);
        setSelectedDocument(null);
        fetchDocuments();
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('documents.failedToUpdate'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('documents.failedToUpdate'),
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const handleParseDocument = async (documentId) => {
    try {
      const response = await api.post(
        `/ragflow/datasets/${datasetId}/chunks`,
        {
          document_ids: [documentId]
        }
      );

      if (response.data.success) {
        toast({
          title: t('toast.success'),
          description: t('documents.documentParseStarted'),
        });
        fetchDocuments();
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('documents.failedToParse'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('documents.failedToParse'),
        variant: 'destructive',
      });
    }
  };

  const handleStopParseDocument = async (documentId) => {
    try {
      const response = await api.delete(
        `/ragflow/datasets/${datasetId}/chunks`,
        {
          data: {
            document_ids: [documentId]
          }
        }
      );

      if (response.data.success) {
        toast({
          title: t('toast.success'),
          description: t('documents.documentParseStopped'),
        });
        fetchDocuments();
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('documents.failedToStopParse'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('documents.failedToStopParse'),
        variant: 'destructive',
      });
    }
  };

  const isDocumentParsing = (document) => {
    // Document is parsing if run exists and is not UNSTART or '0', and status is not 'DONE'
    return document.run && 
           document.run !== 'UNSTART' && 
           document.run !== '0' && 
           document.status !== 'DONE';
  };

  const isDocumentDone = (document) => {
    // Document is done if status is 'DONE'
    return document.status === 'DONE';
  };

  const isDocumentNotStarted = (document) => {
    // Document hasn't started parsing yet
    return document.run === 'UNSTART' || document.run === '0' || !document.run;
  };

  const shouldShowParseButton = (document) => {
    // Show parse button only if status is not 'DONE'
    return !isDocumentDone(document);
  };

  const shouldShowStopButton = (document) => {
    // Show stop button only if currently parsing
    return isDocumentParsing(document);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center py-2">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ragflow')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('documents.title')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('documents.subtitle')} ({total} {t('documents.totalDocuments')})
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchDocuments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
          {selectedDocumentIds.length > 0 && (
            <>
              <Button
                variant="default"
                onClick={() => setParseDialogOpen(true)}
              >
                <Play className="h-4 w-4 mr-2" />
                Parse Selected ({selectedDocumentIds.length})
              </Button>
              <Button
                variant="default"
                onClick={() => setStopParseDialogOpen(true)}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Parsing ({selectedDocumentIds.length})
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setSelectedDocument(null);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedDocumentIds.length})
              </Button>
            </>
          )}
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Documents
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
                          setSelectedDocumentIds(documents.map(d => d.id));
                        } else {
                          setSelectedDocumentIds([]);
                        }
                      }}
                      checked={selectedDocumentIds.length === documents.length && documents.length > 0}
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Size</TableHead>
                  <TableHead className="font-semibold">Chunk Method</TableHead>
                  <TableHead className="font-semibold text-center">Chunks</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    No documents found
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((document) => (
                  <TableRow key={document.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedDocumentIds.includes(document.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocumentIds([...selectedDocumentIds, document.id]);
                          } else {
                            setSelectedDocumentIds(selectedDocumentIds.filter(id => id !== document.id));
                          }
                        }}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-medium py-4 max-w-xs truncate" title={document.name || document.location}>
                      {document.name || document.location}
                    </TableCell>
                    <TableCell>
                      {document.type ? (
                        <Badge variant="outline" className="font-normal">
                          {document.type}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatFileSize(document.size)}</TableCell>
                    <TableCell>
                      {document.chunk_method ? (
                        <Badge variant="outline" className="font-normal">
                          {document.chunk_method}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-semibold">
                        {document.chunk_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={
                          document.run === 'UNSTART' || document.run === '0' 
                            ? 'secondary'
                            : document.status === '1' 
                            ? 'default'
                            : 'secondary'
                        }
                        className={
                          document.run === 'UNSTART' || document.run === '0' 
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                            : document.status === '1' 
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : ''
                        }
                      >
                        {document.run || document.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(document.create_date)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        {shouldShowStopButton(document) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStopParseDocument(document.id)}
                            title="Stop Parsing"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        {shouldShowParseButton(document) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleParseDocument(document.id)}
                            title="Start Parsing"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/ragflow/datasets/${datasetId}/documents/${document.id}/chunks`)}
                          title="View Chunks"
                          className="h-8 w-8"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(document)}
                          title="Download"
                          className="h-8 w-8"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(document)}
                          title="Edit"
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedDocument(document);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="files">Select Files</Label>
              <Input
                id="files"
                type="file"
                multiple
                onChange={handleFileSelect}
              />
              {selectedFiles.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedFiles.length} file(s) selected
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setUploadDialogOpen(false);
                setSelectedFiles([]);
              }}>
                Cancel
              </Button>
              <Button type="button" onClick={handleUpload}>
                Upload
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_doc_name">Document Name</Label>
              <Input
                id="edit_doc_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_doc_chunk_method">Chunk Method</Label>
              <Select
                value={formData.chunk_method}
                onValueChange={(value) => setFormData({ ...formData, chunk_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="naive">Naive (General)</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="qa">Q&A</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="paper">Paper</SelectItem>
                  <SelectItem value="book">Book</SelectItem>
                  <SelectItem value="laws">Laws</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="picture">Picture</SelectItem>
                  <SelectItem value="one">One</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Parser Config for Naive chunk method */}
            {formData.chunk_method === 'naive' && (
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="font-semibold">Parser Configuration</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chunk_token_num">Chunk Token Num</Label>
                    <Input
                      id="chunk_token_num"
                      type="number"
                      min="1"
                      value={formData.parser_config.chunk_token_num}
                      onChange={(e) => setFormData({
                        ...formData,
                        parser_config: {
                          ...formData.parser_config,
                          chunk_token_num: parseInt(e.target.value) || 256
                        }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Default: 256</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="task_page_size">Task Page Size (PDF only)</Label>
                    <Input
                      id="task_page_size"
                      type="number"
                      min="1"
                      value={formData.parser_config.task_page_size}
                      onChange={(e) => setFormData({
                        ...formData,
                        parser_config: {
                          ...formData.parser_config,
                          task_page_size: parseInt(e.target.value) || 12
                        }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Default: 12</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delimiter">Delimiter</Label>
                    <Input
                      id="delimiter"
                      value={formData.parser_config.delimiter || '\n'}
                      onChange={(e) => setFormData({
                        ...formData,
                        parser_config: {
                          ...formData.parser_config,
                          delimiter: e.target.value
                        }
                      })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="layout_recognize"
                      checked={formData.parser_config.layout_recognize || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        parser_config: {
                          ...formData.parser_config,
                          layout_recognize: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="layout_recognize" className="cursor-pointer">
                      Layout Recognize
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="html4excel"
                      checked={formData.parser_config.html4excel || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        parser_config: {
                          ...formData.parser_config,
                          html4excel: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="html4excel" className="cursor-pointer">
                      Convert Excel to HTML
                    </Label>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Document</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Document Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDocument ? (
              <p>
                Are you sure you want to delete <strong>{selectedDocument.name || selectedDocument.location}</strong>?
              </p>
            ) : selectedDocumentIds.length > 0 ? (
              <p>
                Are you sure you want to delete <strong>{selectedDocumentIds.length}</strong> selected document(s)?
              </p>
            ) : (
              <p>Are you sure you want to delete all documents in this dataset?</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedDocument(null);
              }}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  try {
                    let idsToDelete = null;
                    if (selectedDocument) {
                      idsToDelete = [selectedDocument.id];
                    } else if (selectedDocumentIds.length > 0) {
                      idsToDelete = selectedDocumentIds;
                    }

                    const response = await api.delete(
                      `/ragflow/datasets/${datasetId}/documents`,
                      {
                        data: idsToDelete ? { ids: idsToDelete } : {}
                      }
                    );

                    if (response.data.success) {
                      toast({
                        title: 'Success',
                        description: 'Document(s) deleted successfully',
                      });
                      setDeleteDialogOpen(false);
                      setSelectedDocument(null);
                      setSelectedDocumentIds([]);
                      fetchDocuments();
                    } else {
                      toast({
                        title: 'Error',
                        description: response.data.error || 'Failed to delete document(s)',
                        variant: 'destructive',
                      });
                    }
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: error.response?.data?.error || 'Failed to delete document(s)',
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

      {/* Parse Documents Dialog */}
      <Dialog open={parseDialogOpen} onOpenChange={setParseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parse Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to start parsing <strong>{selectedDocumentIds.length}</strong> selected document(s)?
            </p>
            <p className="text-sm text-muted-foreground">
              This will process the documents and create chunks based on the configured chunk method.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setParseDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  try {
                    const response = await api.post(
                      `/ragflow/datasets/${datasetId}/chunks`,
                      {
                        document_ids: selectedDocumentIds
                      }
                    );

                    if (response.data.success) {
                      toast({
                        title: 'Success',
                        description: 'Document parsing started successfully',
                      });
                      setParseDialogOpen(false);
                      fetchDocuments();
                    } else {
                      toast({
                        title: 'Error',
                        description: response.data.error || 'Failed to start parsing documents',
                        variant: 'destructive',
                      });
                    }
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: error.response?.data?.error || 'Failed to start parsing documents',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                Start Parsing
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stop Parsing Dialog */}
      <Dialog open={stopParseDialogOpen} onOpenChange={setStopParseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Parsing Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to stop parsing <strong>{selectedDocumentIds.length}</strong> selected document(s)?
            </p>
            <p className="text-sm text-muted-foreground">
              This will stop the parsing process for the selected documents.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStopParseDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  try {
                    const response = await api.delete(
                      `/ragflow/datasets/${datasetId}/chunks`,
                      {
                        data: {
                          document_ids: selectedDocumentIds
                        }
                      }
                    );

                    if (response.data.success) {
                      toast({
                        title: 'Success',
                        description: 'Document parsing stopped successfully',
                      });
                      setStopParseDialogOpen(false);
                      fetchDocuments();
                    } else {
                      toast({
                        title: 'Error',
                        description: response.data.error || 'Failed to stop parsing documents',
                        variant: 'destructive',
                      });
                    }
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: error.response?.data?.error || 'Failed to stop parsing documents',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                Stop Parsing
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

