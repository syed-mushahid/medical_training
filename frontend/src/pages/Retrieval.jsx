import { useState, useEffect } from 'react';
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
import { MultiSelect } from '../components/ui/multi-select';
import { useTranslation } from 'react-i18next';

export default function Retrieval() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [results, setResults] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [documents, setDocuments] = useState([]);
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
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchDatasets();
    fetchAllDocuments();
  }, []);

  const fetchDatasets = async () => {
    try {
      const response = await api.get('/ragflow/datasets');
      if (response.data.success) {
        setDatasets(response.data.datasets || []);
      }
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchAllDocuments = async () => {
    try {
      // Fetch documents from all datasets
      const datasetsResponse = await api.get('/ragflow/datasets');
      if (datasetsResponse.data.success) {
        const allDatasets = datasetsResponse.data.datasets || [];
        const allDocuments = [];

        // Fetch documents for each dataset
        for (const dataset of allDatasets) {
          try {
            const docsResponse = await api.get(`/ragflow/datasets/${dataset.id}/documents`);
            if (docsResponse.data.success && docsResponse.data.documents) {
              // Add dataset info to each document
              const docsWithDataset = docsResponse.data.documents.map(doc => ({
                ...doc,
                dataset_id: dataset.id,
                dataset_name: dataset.name,
              }));
              allDocuments.push(...docsWithDataset);
            }
          } catch (error) {
            console.error(`Failed to fetch documents for dataset ${dataset.id}:`, error);
          }
        }

        setDocuments(allDocuments);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };


  const handleSearch = async (e) => {
    e.preventDefault();

    if (!formData.question.trim()) {
      toast({
        title: t('toast.error'),
        description: t('retrieval.questionRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (formData.dataset_ids.length === 0 && formData.document_ids.length === 0) {
      toast({
        title: t('toast.error'),
        description: t('retrieval.datasetOrDocumentRequired'),
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
          title: t('toast.success'),
          description: t('retrieval.chunksFound', { count: response.data.total || 0 }),
        });
      } else {
        toast({
          title: t('toast.error'),
          description: response.data.error || t('retrieval.failedToRetrieve'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('retrieval.failedToRetrieve'),
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
          {t('retrieval.backToRAGFlow')}
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('retrieval.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('retrieval.subtitle')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('retrieval.searchParameters')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : (
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">{t('retrieval.question')} *</Label>
                <Textarea
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder={t('retrieval.questionPlaceholder')}
                  required
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('retrieval.datasetIds')}</Label>
                  {datasets.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">{t('retrieval.noDatasetsAvailable')}</p>
                  ) : (
                    <MultiSelect
                      options={datasets.map((dataset) => ({
                        value: dataset.id,
                        label: `${dataset.name} (${dataset.id.substring(0, 8)}...)`,
                      }))}
                      selected={formData.dataset_ids}
                      onChange={(selectedIds) => {
                        setFormData({ ...formData, dataset_ids: selectedIds });
                      }}
                      placeholder={t('retrieval.selectDatasets') || "Select datasets..."}
                      searchPlaceholder={t('retrieval.searchDatasets') || "Search datasets..."}
                      emptyMessage={t('retrieval.noDatasetsFound') || "No datasets found"}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t('retrieval.documentIds')}</Label>
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">{t('retrieval.noDocumentsAvailable')}</p>
                  ) : (
                    <MultiSelect
                      options={documents.map((doc) => ({
                        value: doc.id,
                        label: `${doc.name || doc.id.substring(0, 8)}...${doc.dataset_name ? ` (${doc.dataset_name})` : ''}`,
                      }))}
                      selected={formData.document_ids}
                      onChange={(selectedIds) => {
                        setFormData({ ...formData, document_ids: selectedIds });
                      }}
                      placeholder={t('retrieval.selectDocuments') || "Select documents..."}
                      searchPlaceholder={t('retrieval.searchDocuments') || "Search documents..."}
                      emptyMessage={t('retrieval.noDocumentsFound') || "No documents found"}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="page">{t('retrieval.page')}</Label>
                  <Input
                    id="page"
                    type="number"
                    value={formData.page}
                    onChange={(e) => setFormData({ ...formData, page: e.target.value })}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page_size">{t('retrieval.pageSize')}</Label>
                  <Input
                    id="page_size"
                    type="number"
                    value={formData.page_size}
                    onChange={(e) => setFormData({ ...formData, page_size: e.target.value })}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="similarity_threshold">{t('retrieval.similarityThreshold')}</Label>
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
                  <Label htmlFor="top_k">{t('retrieval.topK')}</Label>
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
                  <Label htmlFor="vector_similarity_weight">{t('retrieval.vectorSimilarityWeight')}</Label>
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
                  <Label htmlFor="keyword">{t('retrieval.enableKeywordMatching')}</Label>
                  <Select
                    value={formData.keyword ? 'true' : 'false'}
                    onValueChange={(value) => setFormData({ ...formData, keyword: value === 'true' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">{t('common.disabled')}</SelectItem>
                      <SelectItem value="true">{t('common.enabled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="highlight">{t('retrieval.enableHighlighting')}</Label>
                  <Select
                    value={formData.highlight ? 'true' : 'false'}
                    onValueChange={(value) => setFormData({ ...formData, highlight: value === 'true' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">{t('common.disabled')}</SelectItem>
                      <SelectItem value="true">{t('common.enabled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                {loading ? t('retrieval.searching') : t('retrieval.search')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>{t('retrieval.searchResults', { count: results.total || 0 })}</CardTitle>
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
                            <p className="font-mono text-xs text-muted-foreground">{t('retrieval.id')}: {chunk.id}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {t('retrieval.document')}: {chunk.document_keyword || chunk.document_id}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {t('retrieval.similarity')}: {(chunk.similarity || 0).toFixed(4)}
                            </p>
                            {chunk.vector_similarity && (
                              <p className="text-xs text-muted-foreground">
                                {t('retrieval.vector')}: {(chunk.vector_similarity || 0).toFixed(4)}
                              </p>
                            )}
                            {chunk.term_similarity && (
                              <p className="text-xs text-muted-foreground">
                                {t('retrieval.term')}: {(chunk.term_similarity || 0).toFixed(4)}
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
                <p className="text-center text-muted-foreground">{t('retrieval.noChunksFound')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

