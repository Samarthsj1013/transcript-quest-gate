import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const TranscriptRequests = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['all-transcript-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcript_requests')
        .select(`
          *,
          users!transcript_requests_student_id_fkey (
            name,
            email,
            usn
          )
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, reason, verificationToken }: { 
      requestId: string; 
      status: 'APPROVED' | 'REJECTED' | 'PENDING'; 
      reason?: string;
      verificationToken?: string;
    }) => {
      const { error } = await supabase
        .from('transcript_requests')
        .update({
          status,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason || null,
          verification_token: verificationToken || null,
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-transcript-requests'] });
      setSelectedRequest(null);
      setRejectionReason('');
      toast.success('Request updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update request');
    },
  });

  const handleApprove = (request: any) => {
    // Generate unique verification token
    const verificationToken = crypto.randomUUID();
    updateRequestMutation.mutate({ 
      requestId: request.id, 
      status: 'APPROVED',
      verificationToken
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    updateRequestMutation.mutate({
      requestId: selectedRequest.id,
      status: 'REJECTED',
      reason: rejectionReason,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Transcript Requests</CardTitle>
          <CardDescription>Review and manage student transcript requests</CardDescription>
        </CardHeader>
        <CardContent>
          {requests && requests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>USN</TableHead>
                  <TableHead>Requested Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.users?.name}</TableCell>
                    <TableCell className="font-mono">{request.users?.usn || 'N/A'}</TableCell>
                    <TableCell>{new Date(request.requested_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          request.status === 'APPROVED'
                            ? 'default'
                            : request.status === 'REJECTED'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request)}
                            disabled={updateRequestMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setSelectedRequest(request)}
                            disabled={updateRequestMutation.isPending}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No transcript requests yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transcript Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this transcript request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={updateRequestMutation.isPending}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TranscriptRequests;
