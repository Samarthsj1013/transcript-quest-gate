import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Download, Eye, FileText, AlertCircle, LogOut, Info, Home } from 'lucide-react';
import { format } from 'date-fns';
import { TranscriptPDF } from '@/components/pdf/TranscriptPDF';
import { pdf } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';

type TranscriptRequest = {
  id: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

const StudentDashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<TranscriptRequest | null>(null);
  const [modalType, setModalType] = useState<'rejection' | 'details' | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['student-transcript-requests', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcript_requests')
        .select('*')
        .eq('student_id', profile?.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data as TranscriptRequest[];
    },
    enabled: !!profile?.id,
  });

  const { data: studentInfo, isLoading: studentLoading } = useQuery({
    queryKey: ['student-info-full', profile?.id],
    queryFn: async () => {
      console.log('[Student Info] Fetching for profile ID:', profile?.id);

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
        .eq('id', profile?.id)
        .single();

      if (error) {
        console.error('[Student Info] Error:', error);
        throw error;
      }

      console.log('[Student Info] Data received:', {
        name: data.name,
        profiles: data.student_profiles,
        branch: data.student_profiles?.[0]?.branches?.branch_name,
        batch: data.student_profiles?.[0]?.academic_batches?.batch_year,
      });

      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: studentMarks } = useQuery({
    queryKey: ['student-marks-all', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_marks')
        .select('*')
        .eq('student_id', profile?.id)
        .order('semester')
        .order('serial_no');

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('branch_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_batches').select('*').order('batch_year');
      if (error) throw error;
      return data;
    },
  });

  // Initialize selected values when student info loads
  useEffect(() => {
    if (studentInfo?.student_profiles?.[0]) {
      const profile = studentInfo.student_profiles[0];
      setSelectedBranch(profile.branch_id || '');
      setSelectedBatch(profile.batch_id || '');
    }
  }, [studentInfo]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBranch || !selectedBatch) {
        throw new Error('Please select both branch and batch');
      }

      if (!profile?.id) {
        throw new Error('User ID not found');
      }

      console.log('[Student Profile] Attempting to save:', {
        user_id: profile.id,
        branch_id: selectedBranch,
        batch_id: selectedBatch
      });

      // Use upsert to either insert or update
      const { data, error } = await supabase
        .from('student_profiles')
        .upsert({
          user_id: profile.id,
          branch_id: selectedBranch,
          batch_id: selectedBatch,
          assigned_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        console.error('[Student Profile] Save error:', error);
        throw new Error(`Failed to save profile: ${error.message}`);
      }

      console.log('[Student Profile] Save successful:', data);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['student-info-full', profile?.id] });
      await queryClient.refetchQueries({ queryKey: ['student-info-full', profile?.id] });
      setIsEditingProfile(false);
      toast({
        title: 'Profile updated successfully',
        description: 'Your branch and batch have been saved.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update profile',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleDownloadPDF = async (request: TranscriptRequest) => {
    if (!studentInfo || !studentMarks) {
      toast({ title: 'Error', description: 'Student data not loaded', variant: 'destructive' });
      return;
    }

    setDownloadingId(request.id);
    try {
      // Load and convert favicon to data URL for PDF
      const loadLogoAsDataUrl = (): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } else {
              reject(new Error('Failed to get canvas context'));
            }
          };

          img.onerror = () => reject(new Error('Failed to load logo'));
          img.src = `${window.location.origin}/favicon.ico`;
        });
      };

      // Generate logo data URL
      let logoDataUrl: string | null = null;
      try {
        logoDataUrl = await loadLogoAsDataUrl();
        console.log('[PDF] Logo loaded successfully');
      } catch (error) {
        console.warn('[PDF] Failed to load logo, continuing without it:', error);
      }

      // Generate QR code for verification using request ID
      const verificationUrl = `${window.location.origin}/verify/${request.id}`;
      console.log('[PDF] Generating QR code for URL:', verificationUrl);
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 150,
        margin: 1,
        errorCorrectionLevel: 'H'
      });

      // Format student_profiles to match expected structure
      // Handle both array and object returns from Supabase
      const profileData = Array.isArray(studentInfo?.student_profiles)
        ? studentInfo.student_profiles[0]
        : studentInfo?.student_profiles;

      console.log('[PDF] Student info:', studentInfo);
      console.log('[PDF] Profile data extracted:', profileData);
      console.log('[PDF] Branch:', profileData?.branches?.branch_name);
      console.log('[PDF] Batch:', profileData?.academic_batches?.batch_year);

      const formattedStudentInfo = {
        ...studentInfo,
        student_profiles: profileData ? [profileData] : []
      };

      console.log('[PDF] Formatted student info:', formattedStudentInfo);

      const studentData = {
        user: formattedStudentInfo,
        marks: studentMarks,
      };

      const pdfDoc = <TranscriptPDF studentData={studentData} qrDataUrl={qrDataUrl} logoDataUrl={logoDataUrl} />;
      const blob = await pdf(pdfDoc).toBlob();

      // Load PDF with pdf-lib to add metadata
      // NOTE: Full PDF encryption with owner/user passwords should be done server-side
      // for proper security. The pdf-lib browser version has limited encryption support.
      const arrayBuffer = await blob.arrayBuffer();
      const pdfLibDoc = await PDFDocument.load(arrayBuffer);

      // Add metadata to discourage copying/editing
      pdfLibDoc.setTitle('Official Academic Transcript - Confidential');
      pdfLibDoc.setAuthor('Global Academy of Technology');
      pdfLibDoc.setSubject('Academic Transcript');
      pdfLibDoc.setKeywords(['transcript', 'confidential', 'official', 'do-not-copy']);
      pdfLibDoc.setProducer('GAT Transcript System');
      pdfLibDoc.setCreator('GAT COE Portal');

      const encryptedPdfBytes = await pdfLibDoc.save();
      // Convert Uint8Array to ArrayBuffer for Blob
      const encryptedArrayBuffer = encryptedPdfBytes.buffer.slice(
        encryptedPdfBytes.byteOffset,
        encryptedPdfBytes.byteOffset + encryptedPdfBytes.byteLength
      ) as ArrayBuffer;
      const protectedBlob = new Blob([encryptedArrayBuffer], { type: 'application/pdf' });

      const url = URL.createObjectURL(protectedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transcript_${studentInfo.usn || 'student'}_${request.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Success!', description: 'PDF downloaded successfully' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Error', description: 'Failed to generate PDF. Please try again.', variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  const openModal = (request: TranscriptRequest, type: 'rejection' | 'details') => {
    setSelectedRequest(request);
    setModalType(type);
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setModalType(null);
  };

  const hasPendingRequest = requests?.some((r) => r.status === 'PENDING');

  // Handle both array and object returns from Supabase
  const profileData = Array.isArray(studentInfo?.student_profiles)
    ? studentInfo.student_profiles[0]
    : studentInfo?.student_profiles;

  const branch = profileData?.branches?.branch_name;
  const batch = profileData?.academic_batches?.batch_year;

  console.log('[Dashboard] Profile data:', {
    studentInfo,
    profileData,
    branch,
    batch,
    isArray: Array.isArray(studentInfo?.student_profiles)
  });

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { label: '⏳ Pending Review', className: 'bg-orange-500 text-white' },
      APPROVED: { label: '✅ Approved', className: 'bg-green-500 text-white' },
      REJECTED: { label: '❌ Rejected', className: 'bg-red-500 text-white' },
    };
    const { label, className } = config[status] || config.PENDING;
    return <Badge className={className}>{label}</Badge>;
  };

  if (requestsLoading || studentLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Navbar */}
      <header className="border-b bg-card sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-lg md:text-xl font-bold">Certified Academic Records System</h1>
              <p className="text-xs text-muted-foreground">Student Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium">{profile?.name}</p>
              <p className="text-xs text-muted-foreground">{studentInfo?.usn || 'N/A'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Home</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Enhanced Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome, {profile?.name}!</CardTitle>
            <CardDescription>View your academic information and transcript requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!isEditingProfile ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">USN</p>
                      <p className="font-semibold">{studentInfo?.usn || 'Not assigned'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Branch</p>
                      <p className="font-semibold">{branch || 'Not assigned'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-semibold text-sm">{studentInfo?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Academic Batch</p>
                      <p className="font-semibold">{batch || 'Not assigned'}</p>
                    </div>
                  </div>

                  {(!branch || !batch) ? (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900">
                        <strong>Action Required:</strong> Please set your branch and batch to help us process your transcript request faster.
                        <Button
                          variant="link"
                          className="text-blue-700 underline p-0 h-auto ml-1"
                          onClick={() => setIsEditingProfile(true)}
                        >
                          Click here to set them now
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      Edit Branch & Batch
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      Select your branch and academic batch. COE can update these if needed.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="student-branch">Branch</Label>
                      <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                        <SelectTrigger id="student-branch">
                          <SelectValue placeholder="Select your branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches?.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.branch_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="student-batch">Academic Batch</Label>
                      <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                        <SelectTrigger id="student-batch">
                          <SelectValue placeholder="Select your batch year" />
                        </SelectTrigger>
                        <SelectContent>
                          {batches?.map((batch) => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.batch_year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => saveProfileMutation.mutate()}
                      disabled={!selectedBranch || !selectedBatch || saveProfileMutation.isPending}
                    >
                      {saveProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingProfile(false);
                        // Reset to original values
                        const profile = studentInfo?.student_profiles?.[0];
                        setSelectedBranch(profile?.branch_id || '');
                        setSelectedBatch(profile?.batch_id || '');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Request Transcript Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>📄 Need Your Academic Transcript?</CardTitle>
                <CardDescription className="mt-1">
                  Request your official grade card and download it once approved by the Chief of Examination.
                  {(!branch || !batch) && <span className="text-blue-600 font-medium"> You can submit even if branch/batch is not assigned!</span>}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/student/request-transcript')}
              disabled={hasPendingRequest}
              size="lg"
              className="w-full sm:w-auto"
            >
              <FileText className="h-4 w-4 mr-2" />
              Request New Transcript
            </Button>
            {hasPendingRequest && (
              <Alert className="mt-4 bg-orange-50 border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  You already have a pending request. Please wait for COE approval.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Request History */}
        <Card>
          <CardHeader>
            <CardTitle>📋 My Transcript Requests</CardTitle>
            <CardDescription>Track the status of your transcript requests</CardDescription>
          </CardHeader>
          <CardContent>
            {requests?.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No requests yet.</p>
                <p className="text-sm text-muted-foreground">
                  Click "Request New Transcript" above to get started.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">#{request.id.slice(0, 8)}</TableCell>
                      <TableCell>{format(new Date(request.requested_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-right">
                        {request.status === 'APPROVED' && (
                          <Button
                            size="sm"
                            onClick={() => handleDownloadPDF(request)}
                            disabled={downloadingId === request.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {downloadingId === request.id ? 'Generating...' : 'Download PDF'}
                          </Button>
                        )}
                        {request.status === 'REJECTED' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openModal(request, 'rejection')}
                          >
                            <Info className="h-4 w-4 mr-1" />
                            View Reason
                          </Button>
                        )}
                        {request.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openModal(request, 'details')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rejection Reason Modal */}
      <Dialog open={modalType === 'rejection'} onOpenChange={closeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Request Rejected
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Request ID</p>
              <p className="font-medium">#{selectedRequest?.id.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rejected on</p>
              <p className="font-medium">
                {selectedRequest?.reviewed_at && format(new Date(selectedRequest.reviewed_at), 'MMM dd, yyyy')}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Reason for Rejection:</p>
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm">{selectedRequest?.rejection_reason || 'No reason provided'}</p>
              </div>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You can submit a new request after addressing the issues mentioned above.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal}>
              Close
            </Button>
            <Button
              onClick={() => {
                closeModal();
                navigate('/student/request-transcript');
              }}
            >
              Submit New Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Details Modal */}
      <Dialog open={modalType === 'details'} onOpenChange={closeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Request ID</p>
              <p className="font-medium">#{selectedRequest?.id.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted on</p>
              <p className="font-medium">
                {selectedRequest && format(new Date(selectedRequest.requested_at), 'MMM dd, yyyy')}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">USN</p>
                <p className="font-medium">{studentInfo?.usn || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{studentInfo?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Branch</p>
                <p className="font-medium">{branch || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Batch</p>
                <p className="font-medium">{batch || 'N/A'}</p>
              </div>
            </div>
            <Alert className="bg-orange-50 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Your request is currently being reviewed by the COE. You will be notified once it's processed.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={closeModal}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentDashboard;
