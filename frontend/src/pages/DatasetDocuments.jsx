import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { ArrowLeft, Plus, RefreshCw, Edit, Download, Trash2, Upload, Play, Square, FileText } from 'lucide-react';
import Loading from '../components/Loading';

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
          title: 'Error',
          description: response.data.error || 'Failed to fetch documents',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to fetch documents',
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
        title: 'Error',
        description: 'Please select at least one file to upload',
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
        `http://localhost:5000/api/ragflow/datasets/${datasetId}/documents/${doc.id}`,
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
          title: 'Success',
          description: 'Document updated successfully',
        });
        setEditDialogOpen(false);
        setSelectedDocument(null);
        fetchDocuments();
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to update document',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update document',
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
            <h1 className="text-2xl font-bold">Documents</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage documents in this dataset ({total} total)
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchDocuments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
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
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Chunk Method</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                  <TableRow key={document.id}>
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
                      />
                    </TableCell>
                    <TableCell className="font-medium">{document.name || document.location}</TableCell>
                    <TableCell>{document.type || '-'}</TableCell>
                    <TableCell>{formatFileSize(document.size)}</TableCell>
                    <TableCell>{document.chunk_method || '-'}</TableCell>
                    <TableCell>{document.chunk_count || 0}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        document.run === 'UNSTART' || document.run === '0' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : document.status === '1' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {document.run || document.status || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(document.create_date)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/ragflow/datasets/${datasetId}/documents/${document.id}/chunks`)}
                          title="View Chunks"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(document)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(document)}
                          title="Edit"
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

