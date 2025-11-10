import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, LogOut, FileText, User } from 'lucide-react';
import { toast } from 'sonner';

const StudentDashboard = () => {
  const { profile, signOut } = useAuth();

  // Fetch student profile with branch and batch
  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          student_profiles (
            branches (branch_name),
            academic_batches (batch_year)
          )
        `)
        .eq('id', profile?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: marks = [] } = useQuery({
    queryKey: ['student-marks', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_marks')
        .select('*')
        .eq('student_id', profile?.id)
        .order('semester', { ascending: true })
        .order('serial_no', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: transcriptRequests = [] } = useQuery({
    queryKey: ['transcript-requests', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcript_requests')
        .select('*')
        .eq('student_id', profile?.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const handleRequestTranscript = async () => {
    try {
      const { error } = await supabase
        .from('transcript_requests')
        .insert({
          student_id: profile?.id,
          status: 'PENDING',
        });

      if (error) throw error;
      toast.success('Transcript request submitted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request');
    }
  };

  const groupedMarks = marks.reduce((acc, mark) => {
    if (!acc[mark.semester]) {
      acc[mark.semester] = [];
    }
    acc[mark.semester].push(mark);
    return acc;
  }, {} as Record<number, typeof marks>);

  const calculateSemesterSGPA = (semesterMarks: typeof marks) => {
    const totalCredits = semesterMarks.reduce((sum, m) => sum + m.credits, 0);
    const totalGradePoints = semesterMarks.reduce((sum, m) => sum + (m.grade_point || 0) * m.credits, 0);
    return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
  };

  const calculateCGPA = () => {
    const totalCredits = marks.reduce((sum, m) => sum + m.credits, 0);
    const totalGradePoints = marks.reduce((sum, m) => sum + (m.grade_point || 0) * m.credits, 0);
    return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Student Portal</h1>
              <p className="text-sm text-muted-foreground">{profile?.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {studentProfile && (studentProfile as any).student_profiles?.[0] && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Branch</p>
                  <p className="font-semibold">
                    {(studentProfile as any).student_profiles[0]?.branches?.branch_name || 'Not Assigned'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Batch</p>
                  <p className="font-semibold">
                    {(studentProfile as any).student_profiles[0]?.academic_batches?.batch_year || 'Not Assigned'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">USN</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile?.usn || 'N/A'}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CGPA</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculateCGPA()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transcript Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transcriptRequests.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="marks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="marks">Academic Records</TabsTrigger>
            <TabsTrigger value="transcripts">Transcript Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="marks" className="space-y-6">
            {Object.entries(groupedMarks).map(([semester, semesterMarks]) => (
              <Card key={semester}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Semester {semester}</CardTitle>
                      <CardDescription>
                        SGPA: {calculateSemesterSGPA(semesterMarks)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>S.No</TableHead>
                        <TableHead>Course Code</TableHead>
                        <TableHead>Course Name</TableHead>
                        <TableHead className="text-right">CIE</TableHead>
                        <TableHead className="text-right">SEE</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Credits</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {semesterMarks.map((mark) => (
                        <TableRow key={mark.id}>
                          <TableCell>{mark.serial_no}</TableCell>
                          <TableCell className="font-mono text-sm">{mark.course_code}</TableCell>
                          <TableCell>{mark.course_name}</TableCell>
                          <TableCell className="text-right">{mark.cie_marks}</TableCell>
                          <TableCell className="text-right">{mark.see_marks}</TableCell>
                          <TableCell className="text-right font-semibold">{mark.total_marks}</TableCell>
                          <TableCell className="text-center">{mark.credits}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{mark.grade}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
            
            {marks.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No academic records available yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transcripts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Transcript Requests</CardTitle>
                    <CardDescription>Request and track your academic transcripts</CardDescription>
                  </div>
                  <Button onClick={handleRequestTranscript}>
                    <FileText className="h-4 w-4 mr-2" />
                    Request Transcript
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {transcriptRequests.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Requested Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reviewed By</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transcriptRequests.map((request) => (
                        <TableRow key={request.id}>
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
                          <TableCell>{request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">{request.rejection_reason || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">No transcript requests yet.</p>
                    <Button onClick={handleRequestTranscript}>
                      <FileText className="h-4 w-4 mr-2" />
                      Request Your First Transcript
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
