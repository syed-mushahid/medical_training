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
import { useToast } from '../components/ui/use-toast.jsx';
import { ArrowLeft, Plus, RefreshCw, Trash2, Edit, Search } from 'lucide-react';
import { Textarea } from '../components/ui/textarea';
import Loading from '../components/Loading';

export default function DocumentChunks() {
  const { datasetId, documentId } = useParams();
  const navigate = useNavigate();
  const [chunks, setChunks] = useState([]);
  const [filteredChunks, setFilteredChunks] = useState([]);
  const [document, setDocument] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChunk, setEditingChunk] = useState(null);
  const [formData, setFormData] = useState({
    content: '',
    important_keywords: [],
    questions: [],
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchChunks();
  }, [datasetId, documentId]);

  const fetchChunks = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/ragflow/datasets/${datasetId}/documents/${documentId}/chunks`);
      if (response.data.success) {
        const chunksData = response.data.chunks || [];
        setChunks(chunksData);
        setFilteredChunks(chunksData);
        setDocument(response.data.document || {});
        setTotal(response.data.total || 0);
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to fetch chunks',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to fetch chunks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter chunks based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredChunks(chunks);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = chunks.filter((chunk) => {
      // Search in content
      const contentMatch = chunk.content?.toLowerCase().includes(query);
      
      // Search in important keywords
      let keywordsMatch = false;
      if (chunk.important_keywords) {
        if (Array.isArray(chunk.important_keywords)) {
          keywordsMatch = chunk.important_keywords.some(kw => 
            kw && kw.toLowerCase().includes(query)
          );
        } else if (typeof chunk.important_keywords === 'string') {
          keywordsMatch = chunk.important_keywords.toLowerCase().includes(query);
        }
      }
      
      // Search in chunk ID
      const idMatch = chunk.id?.toLowerCase().includes(query);
      
      // Search in document keyword
      const docKeywordMatch = chunk.docnm_kwd?.toLowerCase().includes(query);
      
      return contentMatch || keywordsMatch || idMatch || docKeywordMatch;
    });
    
    setFilteredChunks(filtered);
  }, [searchQuery, chunks]);

  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      setFormData({
        ...formData,
        important_keywords: [...formData.important_keywords, keywordInput.trim()],
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (index) => {
    setFormData({
      ...formData,
      important_keywords: formData.important_keywords.filter((_, i) => i !== index),
    });
  };

  const handleAddQuestion = () => {
    if (questionInput.trim()) {
      setFormData({
        ...formData,
        questions: [...formData.questions, questionInput.trim()],
      });
      setQuestionInput('');
    }
  };

  const handleRemoveQuestion = (index) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    });
  };

  const handleAddChunk = async (e) => {
    e.preventDefault();

    if (!formData.content.trim()) {
      toast({
        title: 'Error',
        description: 'Chunk content is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const requestBody = {
        content: formData.content.trim(),
      };

      if (formData.important_keywords.length > 0) {
        requestBody.important_keywords = formData.important_keywords;
      }

      if (formData.questions.length > 0) {
        requestBody.questions = formData.questions;
      }

      const response = await api.post(
        `/ragflow/datasets/${datasetId}/documents/${documentId}/chunks`,
        requestBody
      );

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Chunk added successfully',
        });
        setAddDialogOpen(false);
        resetForm();
        fetchChunks();
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to add chunk',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to add chunk',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (chunk) => {
    setEditingChunk(chunk);
    
    // Handle important_keywords safely
    let keywords = [];
    if (chunk.important_keywords) {
      if (Array.isArray(chunk.important_keywords)) {
        keywords = chunk.important_keywords.filter(k => k && k.trim());
      } else if (typeof chunk.important_keywords === 'string' && chunk.important_keywords.trim()) {
        keywords = chunk.important_keywords.split(',').map(k => k.trim()).filter(k => k);
      }
    }
    
    setFormData({
      content: chunk.content || '',
      important_keywords: keywords,
      questions: [], // Not used in edit, but needed for form
    });
    setKeywordInput('');
    setQuestionInput('');
    setEditDialogOpen(true);
  };

  const handleToggleAvailability = async (chunk, newAvailability) => {
    try {
      const requestBody = {
        available: newAvailability,
      };

      const response = await api.put(
        `/ragflow/datasets/${datasetId}/documents/${documentId}/chunks/${chunk.id}`,
        requestBody
      );

      if (response.data.success) {
        toast({
          title: 'Success',
          description: `Chunk ${newAvailability ? 'enabled' : 'disabled'} successfully`,
        });
        fetchChunks();
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to update chunk availability',
          variant: 'destructive',
        });
        // Revert the change on error
        fetchChunks();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update chunk availability',
        variant: 'destructive',
      });
      // Revert the change on error
      fetchChunks();
    }
  };

  const handleUpdateChunk = async (e) => {
    e.preventDefault();

    if (!formData.content.trim()) {
      toast({
        title: 'Error',
        description: 'Chunk content is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const requestBody = {
        content: formData.content.trim(),
      };

      if (formData.important_keywords.length > 0) {
        requestBody.important_keywords = formData.important_keywords;
      }

      const response = await api.put(
        `/ragflow/datasets/${datasetId}/documents/${documentId}/chunks/${editingChunk.id}`,
        requestBody
      );

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Chunk updated successfully',
        });
        setEditDialogOpen(false);
        setEditingChunk(null);
        resetForm();
        fetchChunks();
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to update chunk',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update chunk',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      content: '',
      important_keywords: [],
      questions: [],
    });
    setKeywordInput('');
    setQuestionInput('');
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(`/ragflow/datasets/${datasetId}/documents`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Chunks</h1>
            <p className="text-muted-foreground mt-2">
              Manage chunks for: <strong>{document?.name || document?.location || 'Unknown Document'}</strong>
              {' '}({total} total chunks)
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchChunks}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Chunk
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search chunks by content, keywords, ID, or document keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              Found {filteredChunks.length} chunk{filteredChunks.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredChunks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No chunks found</p>
            </CardContent>
          </Card>
        ) : (
          filteredChunks.map((chunk) => (
            <Card key={chunk.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Chunk Details</CardTitle>
                    <p className="text-sm text-muted-foreground font-mono mt-1">
                      ID: {chunk.id || '-'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(chunk)}
                      title="Edit Chunk"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-muted-foreground">Available:</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={chunk.available !== false}
                          onChange={(e) => handleToggleAvailability(chunk, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Content Section */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Content</Label>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="whitespace-pre-wrap text-sm">{chunk.content || '-'}</p>
                  </div>
                </div>

                {/* Image Section */}
                {chunk.image_id && chunk.image_id.trim() && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Image</Label>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Image ID: {chunk.image_id}</span>
                        <div className="flex justify-center">
                          <img
                            src={`http://localhost/v1/document/image/${chunk.image_id}`}
                            alt="Chunk image"
                            className="max-w-full max-h-96 h-auto rounded border shadow-sm"
                            onError={(e) => {
                              e.target.parentElement.innerHTML = '<p class="text-sm text-muted-foreground">Image not available</p>';
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Important Keywords Section */}
                {chunk.important_keywords && (
                  (typeof chunk.important_keywords === 'string' && chunk.important_keywords.trim()) ||
                  (Array.isArray(chunk.important_keywords) && chunk.important_keywords.length > 0)
                ) && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Important Keywords</Label>
                    <div className="flex flex-wrap gap-2">
                      {typeof chunk.important_keywords === 'string' 
                        ? chunk.important_keywords.split(',').filter(kw => kw.trim()).map((kw, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {kw.trim()}
                            </span>
                          ))
                        : chunk.important_keywords.map((kw, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {kw}
                            </span>
                          ))
                      }
                    </div>
                  </div>
                )}

                {/* Questions Section */}
                {chunk.questions && chunk.questions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Questions</Label>
                    <div className="space-y-2">
                      {chunk.questions.map((q, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                          <p className="text-sm">{q}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Positions Section */}
                {chunk.positions && Array.isArray(chunk.positions) && chunk.positions.length > 0 && chunk.positions.some(p => p && (typeof p === 'string' ? p.trim() : String(p).trim())) && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Positions</Label>
                    <div className="flex flex-wrap gap-2">
                      {chunk.positions
                        .filter(p => p && (typeof p === 'string' ? p.trim() : String(p).trim()))
                        .map((pos, i) => (
                          <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                            {typeof pos === 'string' ? pos : String(pos)}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {/* Additional Metadata */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  {chunk.docnm_kwd && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Document Keyword</Label>
                      <p className="text-sm font-medium">{chunk.docnm_kwd}</p>
                    </div>
                  )}
                  {chunk.document_id && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Document ID</Label>
                      <p className="text-sm font-mono">{chunk.document_id}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Chunk Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Chunk</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddChunk} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter chunk content"
                required
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Important Keywords</Label>
              <div className="flex space-x-2">
                <Input
                  id="keywords"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  placeholder="Enter keyword and press Enter"
                />
                <Button type="button" onClick={handleAddKeyword}>
                  Add
                </Button>
              </div>
              {formData.important_keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.important_keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center space-x-1"
                    >
                      <span>{keyword}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(index)}
                        className="ml-1 hover:text-blue-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="questions">Questions</Label>
              <div className="flex space-x-2">
                <Input
                  id="questions"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddQuestion();
                    }
                  }}
                  placeholder="Enter question and press Enter"
                />
                <Button type="button" onClick={handleAddQuestion}>
                  Add
                </Button>
              </div>
              {formData.questions.length > 0 && (
                <div className="space-y-1 mt-2">
                  {formData.questions.map((question, index) => (
                    <div
                      key={index}
                      className="px-2 py-1 bg-gray-100 rounded text-sm flex items-center justify-between"
                    >
                      <span>{question}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(index)}
                        className="ml-2 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setAddDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Add Chunk</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Chunk Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Chunk</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateChunk} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content *</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter chunk content"
                required
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-keywords">Important Keywords</Label>
              <div className="flex space-x-2">
                <Input
                  id="edit-keywords"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  placeholder="Enter keyword and press Enter"
                />
                <Button type="button" onClick={handleAddKeyword}>
                  Add
                </Button>
              </div>
              {formData.important_keywords && formData.important_keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.important_keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center space-x-1"
                    >
                      <span>{keyword}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(index)}
                        className="ml-1 hover:text-blue-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setEditDialogOpen(false);
                setEditingChunk(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Update Chunk</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

