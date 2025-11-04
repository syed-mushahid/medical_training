import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast.jsx';
import { ArrowLeft, Search } from 'lucide-react';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export default function Retrieval() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    dataset_ids: [],
    document_ids: [],
    page: 1,
    page_size: 30,
    similarity_threshold: 0.2,
    vector_similarity_weight: 0.3,
    top_k: 1024,
    keyword: false,
    highlight: false,
  });
  const [datasetInput, setDatasetInput] = useState('');
  const [documentInput, setDocumentInput] = useState('');
  const { toast } = useToast();

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

  const handleAddDocument = () => {
    if (documentInput.trim()) {
      setFormData({
        ...formData,
        document_ids: [...formData.document_ids, documentInput.trim()],
      });
      setDocumentInput('');
    }
  };

  const handleRemoveDocument = (index) => {
    setFormData({
      ...formData,
      document_ids: formData.document_ids.filter((_, i) => i !== index),
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!formData.question.trim()) {
      toast({
        title: 'Error',
        description: 'Question is required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.dataset_ids.length === 0 && formData.document_ids.length === 0) {
      toast({
        title: 'Error',
        description: 'Either dataset IDs or document IDs are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const requestBody = {
        question: formData.question.trim(),
      };

      if (formData.dataset_ids.length > 0) {
        requestBody.dataset_ids = formData.dataset_ids;
      }

      if (formData.document_ids.length > 0) {
        requestBody.document_ids = formData.document_ids;
      }

      if (formData.page) requestBody.page = parseInt(formData.page);
      if (formData.page_size) requestBody.page_size = parseInt(formData.page_size);
      if (formData.similarity_threshold) requestBody.similarity_threshold = parseFloat(formData.similarity_threshold);
      if (formData.vector_similarity_weight) requestBody.vector_similarity_weight = parseFloat(formData.vector_similarity_weight);
      if (formData.top_k) requestBody.top_k = parseInt(formData.top_k);
      if ('keyword' in formData) requestBody.keyword = formData.keyword;
      if ('highlight' in formData) requestBody.highlight = formData.highlight;

      const response = await api.post('/ragflow/retrieval', requestBody);

      if (response.data.success) {
        setResults(response.data);
        toast({
          title: 'Success',
          description: `Found ${response.data.total || 0} chunks`,
        });
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to retrieve chunks',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to retrieve chunks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/ragflow')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to RAGFlow
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Chunk Retrieval</h1>
          <p className="text-muted-foreground mt-2">
            Search and retrieve chunks from datasets using semantic search
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question *</Label>
              <Textarea
                id="question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Enter your question or query keywords"
                required
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="datasets">Dataset IDs</Label>
                <div className="flex space-x-2">
                  <Input
                    id="datasets"
                    value={datasetInput}
                    onChange={(e) => setDatasetInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDataset();
                      }
                    }}
                    placeholder="Enter dataset ID and press Enter"
                  />
                  <Button type="button" onClick={handleAddDataset}>
                    Add
                  </Button>
                </div>
                {formData.dataset_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.dataset_ids.map((id, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center space-x-1"
                      >
                        <span className="font-mono text-xs">{id}</span>
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

              <div className="space-y-2">
                <Label htmlFor="documents">Document IDs</Label>
                <div className="flex space-x-2">
                  <Input
                    id="documents"
                    value={documentInput}
                    onChange={(e) => setDocumentInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDocument();
                      }
                    }}
                    placeholder="Enter document ID and press Enter"
                  />
                  <Button type="button" onClick={handleAddDocument}>
                    Add
                  </Button>
                </div>
                {formData.document_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.document_ids.map((id, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm flex items-center space-x-1"
                      >
                        <span className="font-mono text-xs">{id}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(index)}
                          className="ml-1 hover:text-purple-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="page">Page</Label>
                <Input
                  id="page"
                  type="number"
                  value={formData.page}
                  onChange={(e) => setFormData({ ...formData, page: e.target.value })}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="page_size">Page Size</Label>
                <Input
                  id="page_size"
                  type="number"
                  value={formData.page_size}
                  onChange={(e) => setFormData({ ...formData, page_size: e.target.value })}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="similarity_threshold">Similarity Threshold</Label>
                <Input
                  id="similarity_threshold"
                  type="number"
                  step="0.1"
                  value={formData.similarity_threshold}
                  onChange={(e) => setFormData({ ...formData, similarity_threshold: e.target.value })}
                  min="0"
                  max="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="top_k">Top K</Label>
                <Input
                  id="top_k"
                  type="number"
                  value={formData.top_k}
                  onChange={(e) => setFormData({ ...formData, top_k: e.target.value })}
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vector_similarity_weight">Vector Similarity Weight</Label>
                <Input
                  id="vector_similarity_weight"
                  type="number"
                  step="0.1"
                  value={formData.vector_similarity_weight}
                  onChange={(e) => setFormData({ ...formData, vector_similarity_weight: e.target.value })}
                  min="0"
                  max="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyword">Enable Keyword Matching</Label>
                <Select
                  value={formData.keyword ? 'true' : 'false'}
                  onValueChange={(value) => setFormData({ ...formData, keyword: value === 'true' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Disabled</SelectItem>
                    <SelectItem value="true">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="highlight">Enable Highlighting</Label>
                <Select
                  value={formData.highlight ? 'true' : 'false'}
                  onValueChange={(value) => setFormData({ ...formData, highlight: value === 'true' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Disabled</SelectItem>
                    <SelectItem value="true">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({results.total || 0} chunks found)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.chunks && results.chunks.length > 0 ? (
                results.chunks.map((chunk) => (
                  <Card key={chunk.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-mono text-xs text-muted-foreground">ID: {chunk.id}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Document: {chunk.document_keyword || chunk.document_id}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              Similarity: {(chunk.similarity || 0).toFixed(4)}
                            </p>
                            {chunk.vector_similarity && (
                              <p className="text-xs text-muted-foreground">
                                Vector: {(chunk.vector_similarity || 0).toFixed(4)}
                              </p>
                            )}
                            {chunk.term_similarity && (
                              <p className="text-xs text-muted-foreground">
                                Term: {(chunk.term_similarity || 0).toFixed(4)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {chunk.highlight ? (
                            <p className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: chunk.highlight }} />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{chunk.content || '-'}</p>
                          )}
                        </div>
                        {chunk.important_keywords && chunk.important_keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {chunk.important_keywords.map((kw, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-center text-muted-foreground">No chunks found</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

