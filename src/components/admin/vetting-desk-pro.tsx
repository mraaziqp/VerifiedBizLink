'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, Loader2, Eye, Download, RefreshCw, ShieldAlert
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  name: string;
  doc_type: string;
  status: 'uploaded' | 'reviewing' | 'approved' | 'rejected';
  grade: number;
  review_notes: string;
  uploaded_at: string;
  file_url?: string;
}

interface Business {
  id: string;
  company_name: string;
  industry: string;
  reg_number: string;
  vat_number: string;
  status: 'pending' | 'reviewing' | 'verified' | 'rejected';
  trust_score: number;
  submitted_at: string;
  owner_name: string;
  owner_email: string;
  owner_avatar: string;
  documents: Document[];
  doc_count: number;
  review_notes?: string;
  user_id?: string;
  created_at?: string;
  /** How the badge was granted: subscription, verification_fee, vetting_review. */
  badge_source?: string | null;
  documents_reviewed_at?: string | null;
  package_type?: string | null;
}

/**
 * Carrying the verified badge because they paid, with nobody having looked at
 * the documents yet.
 *
 * Every paid plan and the R49 once-off grant the badge on payment, which makes
 * the business 'verified' and drops it out of every other filter here. These
 * are the ones still owed the review they paid for.
 */
function isPaidUnreviewed(b: Business): boolean {
  return (
    b.status === 'verified' &&
    (b.badge_source === 'subscription' || b.badge_source === 'verification_fee') &&
    !b.documents_reviewed_at
  );
}

type BusinessStatus = Business['status'];
type DocReviewStatus = 'reviewing' | 'approved' | 'rejected';
type SortBy = 'newest' | 'oldest' | 'score-high' | 'score-low';
/** Business statuses plus 'paid_unreviewed', which is a queue, not a status. */
type StatusFilter = BusinessStatus | 'all' | 'paid_unreviewed';

const DOC_REVIEW_STATUSES: DocReviewStatus[] = ['reviewing', 'approved', 'rejected'];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  reviewing: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  verified: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const DOC_STATUS_BADGE: Record<string, string> = {
  uploaded: 'bg-blue-100 text-blue-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export function VettingDeskPro() {
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  // Derived: the desk is "loading" only until the first fetch has landed.
  const [loaded, setLoaded] = useState(false);
  const loading = !loaded;
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // 'paid_unreviewed' is not a business status — it is the queue of businesses
  // that were given the badge by paying, before anyone checked their documents.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [updatingBusinessId, setUpdatingBusinessId] = useState<string | null>(null);
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [docGrade, setDocGrade] = useState(0);
  const [docStatus, setDocStatus] = useState<DocReviewStatus>('reviewing');
  const [docNotes, setDocNotes] = useState('');
  const [businessNotes, setBusinessNotes] = useState('');
  const [newStatus, setNewStatus] = useState<BusinessStatus>('reviewing');

  const fetchBusinesses = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/businesses', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
      }
    } catch {
      toast({ title: 'Failed to load businesses', variant: 'destructive' });
    } finally {
      // Marks the first load done. A refresh re-fetches in the background
      // rather than blanking the desk an admin is reading.
      setLoaded(true);
    }
  }, [toast]);

  useEffect(() => {
    void (async () => {
      await fetchBusinesses();
    })();
  }, [fetchBusinesses]);

  const filteredBusinesses = useMemo(() => {
    const list = businesses.filter(b => {
      if (statusFilter === 'paid_unreviewed') {
        if (!isPaidUnreviewed(b)) return false;
      } else if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (searchQuery && !b.company_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !b.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !b.owner_email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    list.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        case 'oldest': return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
        case 'score-high': return b.trust_score - a.trust_score;
        case 'score-low': return a.trust_score - b.trust_score;
        default: return 0;
      }
    });

    return list;
  }, [businesses, statusFilter, searchQuery, sortBy]);

  const handleGradeDocument = async (docId: string) => {
    setUpdatingDocId(docId);
    try {
      const res = await fetch(`/api/admin/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: docGrade,
          status: docStatus,
          reviewNotes: docNotes,
        }),
      });

      if (res.ok) {
        toast({ title: 'Document graded successfully' });
        if (selectedBusiness) {
          const updated = await fetch(`/api/admin/businesses/${selectedBusiness.id}`, { cache: 'no-store' });
          if (updated.ok) {
            const data = await updated.json();
            setSelectedBusiness(data.business);
          }
        }
        fetchBusinesses();
        setSelectedDoc(null);
        setDocGrade(0);
        setDocNotes('');
      }
    } catch {
      toast({ title: 'Failed to grade document', variant: 'destructive' });
    } finally {
      setUpdatingDocId(null);
    }
  };

  const handleUpdateBusinessStatus = async () => {
    if (!selectedBusiness) return;
    setUpdatingBusinessId(selectedBusiness.id);
    try {
      const res = await fetch(`/api/admin/businesses/${selectedBusiness.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reviewNotes: businessNotes,
        }),
      });

      if (res.ok) {
        toast({ title: 'Business status updated' });
        fetchBusinesses();
        setDialogOpen(false);
      }
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    } finally {
      setUpdatingBusinessId(null);
    }
  };

  const openBusinessReview = (business: Business) => {
    setSelectedBusiness(business);
    setBusinessNotes(business.review_notes || '');
    setNewStatus(business.status === 'verified' || business.status === 'rejected' ? 'reviewing' : business.status);
    setDialogOpen(true);
  };

  const stats = {
    pending: businesses.filter(b => b.status === 'pending').length,
    reviewing: businesses.filter(b => b.status === 'reviewing').length,
    verified: businesses.filter(b => b.status === 'verified').length,
    paidUnreviewed: businesses.filter(isPaidUnreviewed).length,
    avgScore: Math.round(businesses.reduce((sum, b) => sum + b.trust_score, 0) / businesses.length) || 0,
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Paid, but nobody has checked them yet. Above the stats because it is
          the one queue that represents a promise already taken money for. */}
      {stats.paidUnreviewed > 0 && (
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold text-amber-900">
                  {stats.paidUnreviewed} business{stats.paidUnreviewed === 1 ? '' : 'es'} carrying the badge
                  without a document review
                </p>
                <p className="text-sm text-amber-800">
                  Paying grants the badge immediately, so these are already showing as
                  verified to the public. They still owe you the vetting they paid for.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setStatusFilter('paid_unreviewed')}
              className="shrink-0 bg-amber-500 font-bold text-white hover:bg-amber-600"
            >
              Review them
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-sm text-gray-600">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-600">{stats.reviewing}</div>
            <p className="text-sm text-gray-600">In Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">{stats.verified}</div>
            <p className="text-sm text-gray-600">Verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-600">{stats.avgScore}%</div>
            <p className="text-sm text-gray-600">Avg Trust Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search by company, owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={() => fetchBusinesses()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="paid_unreviewed">Paid — awaiting document review ({stats.paidUnreviewed})</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="score-high">Highest Score</option>
                <option value="score-low">Lowest Score</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business List */}
      <Card>
        <CardContent className="pt-6 px-2 sm:px-6">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Trust Score</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBusinesses.map(business => (
                  <TableRow key={business.id}>
                    <TableCell className="font-medium">{business.company_name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{business.owner_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={(STATUS_COLORS[business?.status || 'pending'] || STATUS_COLORS.pending).text}>
                        {(business?.status || 'pending').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {business.doc_count > 0 && <FileText className="h-4 w-4 text-blue-600" />}
                        <span className="text-sm">{business.doc_count} docs</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${business.trust_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{business.trust_score}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {business.submitted_at
                        ? new Date(business.submitted_at).toLocaleDateString()
                        : (business.created_at
                          ? new Date(business.created_at).toLocaleDateString()
                          : 'Pending')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => openBusinessReview(business)}
                        disabled={updatingBusinessId === business.id}
                      >
                        {updatingBusinessId === business.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Review'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBusiness?.company_name} - Verification Review</DialogTitle>
          </DialogHeader>

          {selectedBusiness && (
            <Tabs defaultValue="documents" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="status">Status</TabsTrigger>
              </TabsList>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4">
                {(selectedBusiness?.documents || []).map(doc => (
                  <Card key={doc?.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold">{doc?.name || 'Document'}</h3>
                          <p className="text-sm text-gray-600">{(doc?.doc_type || 'document').toUpperCase()}</p>
                        </div>
                        <Badge className={DOC_STATUS_BADGE[doc?.status || 'uploaded'] || 'bg-gray-100 text-gray-800'}>
                          {(doc?.status || 'uploaded').toUpperCase()}
                        </Badge>
                      </div>

                      <div className="mb-4 p-3 bg-gray-50 rounded flex items-center justify-between">
                        <a
                          href={`/api/businesses/documents?id=${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 text-sm hover:underline flex items-center gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
                          View / Download Document
                        </a>
                        <Download className="h-4 w-4 text-gray-400" />
                      </div>

                      {selectedDoc?.id === doc.id ? (
                        <div className="space-y-4 mt-4 p-4 bg-blue-50 rounded border-l-4 border-blue-500">
                          <div>
                            <label className="block text-sm font-medium mb-2">Grade (0-100)</label>
                            <div className="flex gap-2">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={docGrade}
                                onChange={(e) => setDocGrade(Number(e.target.value))}
                                className="flex-1"
                              />
                              <span className="text-lg font-bold w-12">{docGrade}</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Status</label>
                            <select
                              value={docStatus}
                              onChange={(e) => setDocStatus(e.target.value as DocReviewStatus)}
                              className="w-full border rounded px-3 py-2"
                            >
                              <option value="reviewing">Reviewing</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Review Notes</label>
                            <Textarea
                              value={docNotes}
                              onChange={(e) => setDocNotes(e.target.value)}
                              placeholder="Add your detailed review notes..."
                              rows={3}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleGradeDocument(doc.id)}
                              disabled={updatingDocId === doc.id}
                              className="flex-1"
                            >
                              {updatingDocId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Grade'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedDoc(null);
                                setDocGrade(0);
                                setDocNotes('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setDocGrade(doc.grade || 0);
                            setDocStatus(DOC_REVIEW_STATUSES.includes(doc.status as DocReviewStatus) ? (doc.status as DocReviewStatus) : 'reviewing');
                            setDocNotes(doc.review_notes || '');
                          }}
                        >
                          {doc.grade > 0 ? 'Edit Grade' : 'Grade Document'}
                        </Button>
                      )}

                      {doc.grade > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-gray-600 mb-2">Current Grade: <strong>{doc.grade}/100</strong></p>
                          {doc.review_notes && <p className="text-sm text-gray-600">Notes: {doc.review_notes}</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Registration Number</p>
                    <p className="font-semibold">{selectedBusiness.reg_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">VAT Number</p>
                    <p className="font-semibold">{selectedBusiness.vat_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Industry</p>
                    <p className="font-semibold">{selectedBusiness.industry}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Owner Email</p>
                    <p className="font-semibold">{selectedBusiness.owner_email}</p>
                  </div>
                </div>
              </TabsContent>

              {/* Status Tab */}
              <TabsContent value="status" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Business Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as BusinessStatus)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Review Notes</label>
                  <Textarea
                    value={businessNotes}
                    onChange={(e) => setBusinessNotes(e.target.value)}
                    placeholder="Overall review summary..."
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleUpdateBusinessStatus}
                  disabled={updatingBusinessId === selectedBusiness.id}
                  className="w-full"
                >
                  {updatingBusinessId === selectedBusiness.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Update Status
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
