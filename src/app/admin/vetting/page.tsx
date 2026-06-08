"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface VettingSubmission {
  id: string;
  business_id: string;
  business_name: string;
  cipc_registration_number: string;
  cipc_status: "pending" | "approved" | "rejected";
  sars_tax_reference: string;
  sars_status: "pending" | "approved" | "rejected";
  overall_status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function VettingPage() {
  const [submissions, setSubmissions] = useState<VettingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<VettingSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch("/api/admin/vetting");
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error("Failed to fetch vetting submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submissionId: string) => {
    setProcessingId(submissionId);
    try {
      const response = await fetch(`/api/admin/vetting/${submissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overall_status: "approved",
          admin_notes: adminNotes,
        }),
      });

      if (response.ok) {
        await fetchSubmissions();
        setSelectedSubmission(null);
        setAdminNotes("");
      }
    } catch (error) {
      console.error("Error approving submission:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (submissionId: string) => {
    if (!adminNotes) {
      alert("Please provide rejection reason");
      return;
    }

    setProcessingId(submissionId);
    try {
      const response = await fetch(`/api/admin/vetting/${submissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overall_status: "rejected",
          admin_notes: adminNotes,
        }),
      });

      if (response.ok) {
        await fetchSubmissions();
        setSelectedSubmission(null);
        setAdminNotes("");
      }
    } catch (error) {
      console.error("Error rejecting submission:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-400";
      case "rejected":
        return "text-red-400";
      default:
        return "text-yellow-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Business Verification</h1>
          <p className="text-gray-400">Review and approve CIPC and SARS verification</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submissions List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid gap-4">
              {submissions.filter((s) => s.overall_status === "pending").length > 0 ? (
                submissions.map((submission) => (
                  <Card
                    key={submission.id}
                    className={`bg-gradient-to-br border cursor-pointer transition-all ${
                      selectedSubmission?.id === submission.id
                        ? "from-cyan-500/20 to-purple-500/20 border-cyan-500/50"
                        : "from-gray-800/40 to-gray-900/40 border-cyan-500/20 hover:border-cyan-500/50"
                    } p-6`}
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-bold text-lg">{submission.business_name}</h3>
                        <p className="text-gray-400 text-sm">ID: {submission.business_id}</p>
                      </div>
                      <span className={`text-sm font-semibold ${getStatusColor(submission.overall_status)}`}>
                        {submission.overall_status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* CIPC Status */}
                      <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(submission.cipc_status)}
                          <span className="text-gray-300 text-sm">CIPC</span>
                        </div>
                        <p className="text-xs text-gray-400">{submission.cipc_registration_number || "No number"}</p>
                      </div>

                      {/* SARS Status */}
                      <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(submission.sars_status)}
                          <span className="text-gray-300 text-sm">SARS</span>
                        </div>
                        <p className="text-xs text-gray-400">{submission.sars_tax_reference || "No number"}</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      Submitted: {new Date(submission.created_at).toLocaleDateString()}
                    </p>
                  </Card>
                ))
              ) : (
                <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-cyan-500/20 p-8 text-center">
                  <p className="text-gray-400">No pending verifications</p>
                </Card>
              )}
            </div>
          </div>

          {/* Review Panel */}
          {selectedSubmission && (
            <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-cyan-500/20 backdrop-blur-xl p-6 h-fit sticky top-8">
              <h2 className="text-xl font-bold text-white mb-6">Review Details</h2>

              <div className="space-y-4 mb-6">
                {/* Business Name */}
                <div>
                  <p className="text-gray-400 text-sm">Business</p>
                  <p className="text-white font-semibold">{selectedSubmission.business_name}</p>
                </div>

                {/* CIPC Info */}
                <div>
                  <p className="text-gray-400 text-sm">CIPC Registration</p>
                  <p className="text-white">{selectedSubmission.cipc_registration_number || "Pending"}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusIcon(selectedSubmission.cipc_status)}
                    <span className={`text-sm ${getStatusColor(selectedSubmission.cipc_status)}`}>
                      {selectedSubmission.cipc_status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* SARS Info */}
                <div>
                  <p className="text-gray-400 text-sm">SARS Tax Reference</p>
                  <p className="text-white">{selectedSubmission.sars_tax_reference || "Pending"}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusIcon(selectedSubmission.sars_status)}
                    <span className={`text-sm ${getStatusColor(selectedSubmission.sars_status)}`}>
                      {selectedSubmission.sars_status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-medium mb-2">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Enter approval/rejection notes..."
                  rows={4}
                  className="bg-gray-800/50 border-cyan-500/20 text-white placeholder:text-gray-500"
                />
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={() => handleApprove(selectedSubmission.id)}
                  disabled={processingId === selectedSubmission.id}
                  className="w-full bg-green-600 text-white hover:bg-green-700 gap-2"
                >
                  {processingId === selectedSubmission.id && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Approve Verification
                </Button>

                <Button
                  onClick={() => handleReject(selectedSubmission.id)}
                  disabled={processingId === selectedSubmission.id || !adminNotes}
                  className="w-full bg-red-600 text-white hover:bg-red-700 gap-2"
                >
                  {processingId === selectedSubmission.id && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Reject with Notes
                </Button>
              </div>

              <p className="text-gray-500 text-xs mt-4">
                Note: Write rejection reasons before rejecting
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
