'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { GlassBackground, glassInteractive } from '@/components/shared/glass-ui';

interface BizDocument {
  id: string;
  name: string;
  doc_type: string;
  status: string;
  uploaded_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  uploaded: 'bg-blue-500/10 text-blue-400',
  reviewing: 'bg-yellow-500/10 text-yellow-400',
  approved: 'bg-green-500/10 text-green-400',
  rejected: 'bg-red-500/10 text-red-400',
};

export default function BusinessDocumentsPage() {
  const [documents, setDocuments] = useState<BizDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/businesses')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDocuments(data?.business?.documents ?? []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <GlassBackground>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/business/dashboard"
          className={`inline-flex items-center gap-2 text-yellow-500 hover:text-yellow-400 mb-6 rounded-lg ${glassInteractive}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="mb-8 bg-slate-900/60 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-100">Verification Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/vetting">
              <Button className={`gap-2 bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold ${glassInteractive}`}>
                <Upload className="h-4 w-4" />
                Upload Document
              </Button>
            </Link>
            <p className="text-sm text-slate-400">
              Upload CIPC registration, SARS tax clearance, and other verification documents in the Vetting Hub.
            </p>
          </CardContent>
        </Card>

        {/* Documents List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <Card className="bg-slate-900/60 backdrop-blur-xl border-white/5 shadow-2xl">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No documents uploaded yet</p>
              </CardContent>
            </Card>
          ) : (
            documents.map((doc) => (
              <Card key={doc.id} className="bg-slate-900/60 backdrop-blur-xl border-white/5 shadow-2xl">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-100 truncate">{doc.name}</p>
                      <p className="text-sm text-slate-400">
                        {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[doc.status] || 'bg-slate-500/10 text-slate-400'}`}>
                    {doc.status}
                  </span>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </GlassBackground>
  );
}
