'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

interface Document {
  id: string;
  name: string;
  doc_type: string;
  file_url: string;
  business_id: string;
  business_name: string;
  status: 'uploaded' | 'reviewing' | 'approved' | 'rejected';
  grade: number;
  review_notes: string;
  uploaded_at: string;
}

export default function RamoneDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'uploaded' | 'reviewing' | 'approved' | 'rejected'>('uploaded');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [grade, setGrade] = useState(0);
  const [status, setStatus] = useState<'reviewing' | 'approved' | 'rejected'>('reviewing');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/documents?status=uploaded');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeDocument = async () => {
    if (!selectedDoc) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/documents/${selectedDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade,
          status,
          reviewNotes: notes,
        }),
      });

      if (res.ok) {
        await fetchDocuments();
        setSelectedDoc(null);
        setGrade(0);
        setStatus('reviewing');
        setNotes('');
      }
    } catch (error) {
      console.error('Failed to grade document:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDocs = documents.filter(d => filterStatus === 'all' || d.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Link href="/admin/ramone" className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-6">
          <ArrowLeft className="h-5 w-5" />
          Back to Command Center
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-400" />
            Document Review Queue
          </h1>
          <p className="text-gray-400 mt-2">Grade and review business verification documents</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document List */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800/40 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Documents ({filteredDocs.length})</span>
                  <div className="flex gap-2">
                    <Button
                      variant={filterStatus === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={filterStatus === 'uploaded' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus('uploaded')}
                    >
                      Pending
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredDocs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No documents to review</p>
                ) : (
                  filteredDocs.map(doc => (
                    <div
                      key={doc.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedDoc?.id === doc.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 hover:border-gray-600 hover:bg-gray-700/30'
                      }`}
                      onClick={() => {
                        setSelectedDoc(doc);
                        setGrade(doc.grade || 0);
                        setStatus((doc.status as any) || 'reviewing');
                        setNotes(doc.review_notes || '');
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-white">{doc.name}</h3>
                          <p className="text-sm text-gray-400">{doc.business_name}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs ${
                          doc.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                          doc.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {doc.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(doc.uploaded_at).toLocaleDateString()} • {doc.doc_type}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Review Panel */}
          {selectedDoc && (
            <Card className="bg-gray-800/40 border-gray-700 h-fit">
              <CardHeader>
                <CardTitle>Review: {selectedDoc.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Preview */}
                <div className="bg-gray-900 rounded p-4 text-center">
                  <FileText className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 mb-2">{selectedDoc.business_name}</p>
                  <a
                    href={selectedDoc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline text-sm flex items-center justify-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    View File
                  </a>
                </div>

                {/* Grade Slider */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Grade (0-100): <span className="text-lg font-bold text-blue-400">{grade}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Poor</span>
                    <span>Good</span>
                    <span>Excellent</span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Decision</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                  >
                    <option value="reviewing">Still Reviewing</option>
                    <option value="approved">✓ Approve</option>
                    <option value="rejected">✗ Reject</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Review Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add detailed feedback for the business owner..."
                    rows={3}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleGradeDocument}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Grade & Feedback
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
