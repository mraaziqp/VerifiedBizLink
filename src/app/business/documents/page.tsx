'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function BusinessDocumentsPage() {
  const [documents, setDocuments] = useState<Array<{id: string; name: string; type: string; date: string}>>([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/business/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Verification Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
            <p className="text-sm text-gray-600">
              Upload CIPC registration, SARS tax clearance, and other verification documents
            </p>
          </CardContent>
        </Card>

        {/* Documents List */}
        <div className="space-y-3">
          {documents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No documents uploaded yet</p>
              </CardContent>
            </Card>
          ) : (
            documents.map(doc => (
              <Card key={doc.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{doc.name}</p>
                      <p className="text-sm text-gray-600">{doc.date}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Download</Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
