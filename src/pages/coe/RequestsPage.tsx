import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Edit, AlertCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';

type TranscriptRequest = {
  id: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  users: {
    id: string;
    name: string;
    email: string;
    usn: string | null;
  };
};

const RequestsPage = () => {
  const navigate = useNavigate();
  const [selectedRequest, setSelectedRequest] = useState<TranscriptRequest | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [studentMarks, setStudentMarks] = useState<any[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['transcript-requests'],
    queryFn: async () => {
      console.log('[RequestsPage] Fetching transcript requests...');
      const { data, error } = await supabase
        .from('transcript_requests')
        .select(`
          id,
          status,
          requested_at,
          reviewed_at,
          rejection_reason,
          student_id,
          users!transcript_requests_student_id_fkey (id, name, email, usn)
        `)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('[RequestsPage] Error fetching requests:', error);
        throw error;
      }
      console.log('[RequestsPage] Fetched', data?.length || 0, 'requests');
      return data as TranscriptRequest[];
    },
  });

  // Refetch requests when page comes into focus (e.g., when returning from student detail page)
  useEffect(() => {
    const handleFocus = () => {
      console.log('[RequestsPage] Page gained focus, refetching requests...');
      refetch();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  const fetchStudentMarks = async (studentId: string) => {
    const { data, error } = await supabase
      .from('student_marks')
      .select('*')
      .eq('student_id', studentId)
      .order('semester', { ascending: true })
      .order('serial_no', { ascending: true });

    if (error) throw error;
    return data;
  };

  const fetchStudentProfile = async (studentId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        student_profiles!student_profiles_user_id_fkey (
          branch_id,
          batch_id,
          branches!student_profiles_branch_id_fkey (branch_name),
          academic_batches!student_profiles_batch_id_fkey (batch_year)
        )
      `)
      .eq('id', studentId)
      .single();

    if (error) throw error;
    return data;
  };

  const handleViewDetails = async (request: TranscriptRequest) => {
    try {
      setSelectedRequest(request);

      // Invalidate queries first to ensure we fetch fresh data
      await queryClient.invalidateQueries({ queryKey: ['student-marks', request.users.id] });
      await queryClient.invalidateQueries({ queryKey: ['student', request.users.id] });

      console.log('[RequestsPage] Fetching fresh student data for:', request.users.id);

      // Fetch latest marks and profile
      const marks = await fetchStudentMarks(request.users.id);
      const profile = await fetchStudentProfile(request.users.id);

      // Handle both array and object returns from Supabase
      const profileData = Array.isArray(profile?.student_profiles)
        ? profile.student_profiles[0]
        : profile?.student_profiles;

      console.log('[RequestsPage] Fetched data:', {
        marksCount: marks?.length || 0,
        hasBranch: !!profileData?.branch_id,
        hasBatch: !!profileData?.batch_id,
        profileData,
      });

      setStudentMarks(marks);
      setStudentProfile(profile);
      setIsApproveDialogOpen(true);
    } catch (error) {
      console.error('[RequestsPage] Error fetching student details:', error);
      toast({
        title: 'Error loading student details',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const handleProcessRequest = (request: TranscriptRequest) => {
    // Navigate to student detail page to assign batch/branch and marks
    navigate(`/coe/students/${request.users.id}`, {
      state: { fromRequest: request.id }
    });
  };

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const updates: any = {
        status,
        reviewed_at: new Date().toISOString(),
      };

      if (status === 'REJECTED' && reason) {
        updates.rejection_reason = reason;
      }

      const { error } = await supabase
        .from('transcript_requests')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcript-requests'] });
      toast({ title: 'Request updated successfully' });
      setSelectedRequest(null);
      setIsRejectDialogOpen(false);
      setRejectionReason('');
    },
    onError: () => {
      toast({ title: 'Failed to update request', variant: 'destructive' });
    },
  });

  const handleApprove = () => {
    if (selectedRequest) {
      // Only check if student has marks entered
      const hasMarks = (studentMarks?.length || 0) > 0;

      if (!hasMarks) {
        toast({
          title: 'Cannot approve request',
          description: 'Student must have marks entered before approval. Batch and branch are optional.',
          variant: 'destructive'
        });
        return;
      }

      updateRequestMutation.mutate({ id: selectedRequest.id, status: 'APPROVED' });
      setIsApproveDialogOpen(false);
    }
  };

  const handleReject = () => {
    if (selectedRequest && rejectionReason.trim()) {
      updateRequestMutation.mutate({ 
        id: selectedRequest.id, 
        status: 'REJECTED', 
        reason: rejectionReason 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: { variant: 'default', className: 'bg-orange-500' },
      APPROVED: { variant: 'default', className: 'bg-green-500' },
      REJECTED: { variant: 'destructive' },
    };
    return <Badge {...variants[status]}>{status}</Badge>;
  };

  const pendingRequests = requests?.filter((r) => r.status === 'PENDING') || [];
  const historyRequests = requests?.filter((r) => r.status !== 'PENDING') || [];

  const groupedMarks = (studentMarks || []).reduce((acc, mark) => {
    if (!acc[mark.semester]) acc[mark.semester] = [];
    acc[mark.semester].push(mark);
    return acc;
  }, {} as Record<number, any[]>);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student USN</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No pending requests
                  </TableCell>
                </TableRow>
              ) : (
                pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.users.usn || 'N/A'}</TableCell>
                    <TableCell>{request.users.name}</TableCell>
                    <TableCell>{format(new Date(request.requested_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" onClick={() => handleProcessRequest(request)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Assign & Mark
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleViewDetails(request)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsRejectDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student USN</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reviewed Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No request history
                  </TableCell>
                </TableRow>
              ) : (
                historyRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.users.usn || 'N/A'}</TableCell>
                    <TableCell>{request.users.name}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {request.reviewed_at ? format(new Date(request.reviewed_at), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleViewDetails(request)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Request Details Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-muted-foreground">USN</Label>
                  <p className="font-medium">{selectedRequest.users.usn || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedRequest.users.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedRequest.users.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Branch</Label>
                  <p className="font-medium">
                    {(() => {
                      const profileData = Array.isArray(studentProfile?.student_profiles)
                        ? studentProfile.student_profiles[0]
                        : studentProfile?.student_profiles;
                      return profileData?.branches?.branch_name || 'Not assigned';
                    })()}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Batch</Label>
                  <p className="font-medium">
                    {(() => {
                      const profileData = Array.isArray(studentProfile?.student_profiles)
                        ? studentProfile.student_profiles[0]
                        : studentProfile?.student_profiles;
                      return profileData?.academic_batches?.batch_year || 'Not assigned';
                    })()}
                  </p>
                </div>
              </div>

              {/* Data Completeness Warning */}
              {selectedRequest?.status === 'PENDING' && (studentMarks?.length || 0) === 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Cannot approve yet:</strong>
                    <div>• Marks must be entered</div>
                    <div className="mt-2">Click "Assign & Mark" to enter student marks. Note: Batch and branch are optional.</div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Marks by Semester */}
              {Object.keys(groupedMarks).length > 0 ? (
                (Object.entries(groupedMarks) as [string, any[]][]).map(([semester, marks]) => (
                  <div key={semester}>
                    <h3 className="font-semibold mb-2">Semester {semester}</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>S.No</TableHead>
                          <TableHead>Course Code</TableHead>
                          <TableHead>Course Name</TableHead>
                          <TableHead>CIE</TableHead>
                          <TableHead>SEE</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {marks.map((mark) => (
                          <TableRow key={mark.id}>
                            <TableCell>{mark.serial_no}</TableCell>
                            <TableCell>{mark.course_code}</TableCell>
                            <TableCell>{mark.course_name}</TableCell>
                            <TableCell>{mark.cie_marks}</TableCell>
                            <TableCell>{mark.see_marks}</TableCell>
                            <TableCell>{mark.total_marks}</TableCell>
                            <TableCell>{mark.grade}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No marks available</p>
              )}

              {/* Rejection Reason */}
              {selectedRequest.rejection_reason && (
                <div className="p-4 bg-destructive/10 rounded-lg">
                  <Label className="text-destructive">Rejection Reason</Label>
                  <p className="mt-1">{selectedRequest.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedRequest?.status === 'PENDING' && (
              <>
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setIsRejectDialogOpen(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button onClick={handleApprove}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
            {selectedRequest?.status !== 'PENDING' && (
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
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
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestsPage;
