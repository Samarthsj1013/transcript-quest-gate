import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Mark = {
  id?: string;
  serial_no: number;
  course_code: string;
  course_name: string;
  cie_marks: number;
  see_marks: number;
  total_marks: number;
  credits: number;
  grade: string;
  grade_point: number;
};

const StudentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [currentSemester, setCurrentSemester] = useState(1);
  const [marks, setMarks] = useState<Mark[]>([]);
  const queryClient = useQueryClient();

  // Check if we're coming from a transcript request
  const fromRequestId = location.state?.fromRequest;

  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      console.log('[Student Query] Fetching student data for ID:', id);

      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          student_profiles!student_profiles_user_id_fkey (
            branch_id,
            batch_id,
            branches!student_profiles_branch_id_fkey (id, branch_name),
            academic_batches!student_profiles_batch_id_fkey (id, batch_year)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('[Student Query] Error:', error);
        throw error;
      }

      console.log('[Student Query] Data received:', {
        name: data.name,
        profiles: data.student_profiles,
        branch_id: data.student_profiles?.[0]?.branch_id,
        batch_id: data.student_profiles?.[0]?.batch_id,
        branch_name: data.student_profiles?.[0]?.branches?.branch_name,
        batch_year: data.student_profiles?.[0]?.academic_batches?.batch_year,
      });

      return data;
    },
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

  const { data: curriculum } = useQuery({
    queryKey: ['curriculum', selectedBatch, selectedBranch, currentSemester],
    queryFn: async () => {
      if (!selectedBatch || !selectedBranch) return [];

      console.log('[Curriculum] Fetching curriculum for:', {
        batch_id: selectedBatch,
        branch_id: selectedBranch,
        semester: currentSemester,
      });

      const { data, error } = await supabase
        .from('curriculum')
        .select('*')
        .eq('batch_id', selectedBatch)
        .eq('branch_id', selectedBranch)
        .eq('semester', currentSemester)
        .order('course_code');

      if (error) {
        console.error('[Curriculum] Error:', error);
        throw error;
      }

      console.log('[Curriculum] Found', data?.length || 0, 'courses');
      if (data && data.length > 0) {
        console.log('[Curriculum] Sample course:', data[0]);
      }

      return data;
    },
    enabled: !!selectedBatch && !!selectedBranch,
  });

  const { data: existingMarks } = useQuery({
    queryKey: ['student-marks', id, currentSemester],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_marks')
        .select('*')
        .eq('student_id', id)
        .eq('semester', currentSemester)
        .order('serial_no');
      if (error) throw error;
      return data;
    },
    enabled: !!id, // Only require student ID, not batch/branch
  });

  useEffect(() => {
    // Handle both array and object returns from Supabase
    const profile = Array.isArray(student?.student_profiles)
      ? student.student_profiles[0]
      : student?.student_profiles;

    if (profile) {
      console.log('[Student Detail] Setting branch and batch from profile:', {
        branch_id: profile.branch_id,
        batch_id: profile.batch_id,
        isArray: Array.isArray(student?.student_profiles)
      });
      setSelectedBranch(profile.branch_id || '');
      setSelectedBatch(profile.batch_id || '');
    }
  }, [student]);

  useEffect(() => {
    console.log('[Student Detail] Loading marks/curriculum:', {
      existingMarksCount: existingMarks?.length || 0,
      curriculumCount: curriculum?.length || 0,
      semester: currentSemester,
    });

    if (existingMarks && existingMarks.length > 0) {
      console.log('[Student Detail] Loading existing marks');
      setMarks(existingMarks as Mark[]);
    } else if (curriculum && curriculum.length > 0) {
      console.log('[Student Detail] Loading curriculum as template');
      setMarks(
        curriculum.map((course, idx) => ({
          serial_no: idx + 1,
          course_code: course.course_code,
          course_name: course.course_name,
          credits: course.credits || 1,
          cie_marks: 0,
          see_marks: 0,
          total_marks: 0,
          grade: '',
          grade_point: 0,
        }))
      );
    } else {
      console.log('[Student Detail] No marks or curriculum found');
      setMarks([]);
    }
  }, [curriculum, existingMarks, currentSemester]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBranch || !selectedBatch) {
        throw new Error('Please select both branch and batch');
      }

      if (!id) {
        throw new Error('Student ID not found');
      }

      console.log('[COE Profile] Attempting to save:', {
        user_id: id,
        branch_id: selectedBranch,
        batch_id: selectedBatch
      });

      // Use upsert to either insert or update
      const { data, error } = await supabase
        .from('student_profiles')
        .upsert({
          user_id: id,
          branch_id: selectedBranch,
          batch_id: selectedBatch,
          assigned_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        console.error('[COE Profile] Save error:', error);
        throw new Error(`Failed to save profile: ${error.message}`);
      }

      console.log('[COE Profile] Save successful:', data);
      return data;
    },
    onSuccess: async () => {
      console.log('[Profile] Profile saved successfully, invalidating queries...');

      try {
        // Invalidate all related queries to ensure fresh data
        await queryClient.invalidateQueries({ queryKey: ['student', id] });
        await queryClient.invalidateQueries({ queryKey: ['students'] });
        await queryClient.invalidateQueries({ queryKey: ['student-info-full'] });
        await queryClient.invalidateQueries({ queryKey: ['curriculum'] });
        await queryClient.invalidateQueries({ queryKey: ['student-marks'] });
        await queryClient.invalidateQueries({ queryKey: ['transcript-requests'] });

        // Force refetch student data to get updated profile
        await queryClient.refetchQueries({ queryKey: ['student', id] });

        console.log('[Profile] All queries invalidated and refetched successfully');

        toast({
          title: 'Profile updated successfully',
          description: 'Branch and batch have been assigned to the student.',
        });
      } catch (error) {
        console.error('[Profile] Error during query invalidation:', error);
        // Still show success since the save worked
        toast({
          title: 'Profile updated',
          description: 'Please refresh the page to see updated data.',
        });
      }
    },
    onError: (error: any) => {
      console.error('[Profile] Mutation error:', error);
      toast({
        title: 'Failed to update profile',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    },
  });

  const saveMarksMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('student_marks').delete().eq('student_id', id).eq('semester', currentSemester);

      const validMarks = marks.filter((m) => m.course_code && m.course_name && m.credits > 0);
      if (validMarks.length > 0) {
        const { data, error } = await supabase.from('student_marks').insert(
          validMarks.map((mark) => ({
            student_id: id,
            semester: currentSemester,
            serial_no: mark.serial_no,
            course_code: mark.course_code.trim(),
            course_name: mark.course_name.trim(),
            cie_marks: mark.cie_marks || null,
            see_marks: mark.see_marks || null,
            total_marks: mark.total_marks || null,
            credits: mark.credits || 1,
            grade: mark.grade?.trim() || null,
            grade_point: mark.grade_point || null,
          }))
        );
        if (error) {
          console.error('Error saving marks:', error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-marks'] });
      toast({ title: 'Marks saved successfully' });
    },
    onError: (error: any) => {
      console.error('Save marks mutation error:', error);
      toast({
        title: 'Failed to save marks',
        description: error.message || error.hint || 'Please check all fields are valid',
        variant: 'destructive'
      });
    },
  });

  const handleMarkChange = (index: number, field: keyof Mark, value: any) => {
    const updated = [...marks];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'cie_marks' || field === 'see_marks') {
      updated[index].total_marks = (updated[index].cie_marks || 0) + (updated[index].see_marks || 0);
    }

    setMarks(updated);
  };

  const handleAddRow = () => {
    setMarks([
      ...marks,
      {
        serial_no: marks.length + 1,
        course_code: '',
        course_name: '',
        cie_marks: 0,
        see_marks: 0,
        total_marks: 0,
        credits: 1,
        grade: '',
        grade_point: 0,
      },
    ]);
  };

  const handleDeleteRow = (index: number) => {
    setMarks(marks.filter((_, i) => i !== index));
  };

  const totalCredits = marks.reduce((sum, m) => sum + (m.credits || 0), 0);
  const sgpa =
    totalCredits > 0 ? marks.reduce((sum, m) => sum + (m.grade_point || 0) * (m.credits || 0), 0) / totalCredits : 0;

  const hasProfile = selectedBranch && selectedBatch;

  if (studentLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      {fromRequestId && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            Processing transcript request. <strong>Enter student marks below</strong> (you can optionally assign batch/branch if curriculum is available), then return to requests to approve.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Student Profile - {student?.name}</CardTitle>
            {fromRequestId && (
              <Button variant="outline" onClick={() => navigate('/coe/requests')}>
                Return to Requests
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">USN</Label>
              <p className="text-lg font-semibold bg-muted px-4 py-2 rounded-md">
                {student?.usn || 'Not Assigned'}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Email</Label>
              <p className="text-lg font-semibold bg-muted px-4 py-2 rounded-md">
                {student?.email}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-4">Academic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger id="branch" className="bg-background">
                    <SelectValue placeholder="Select branch" />
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
                <Label htmlFor="batch">Batch</Label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger id="batch" className="bg-background">
                    <SelectValue placeholder="Select batch" />
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
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => saveProfileMutation.mutate()}
              disabled={!selectedBranch || !selectedBatch || saveProfileMutation.isPending}
              className="w-full md:w-auto"
              size="lg"
            >
              {saveProfileMutation.isPending ? 'Saving Profile...' : 'Save Profile'}
            </Button>
            {saveProfileMutation.isSuccess && !saveProfileMutation.isPending && (
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle className="h-5 w-5" />
                <span>Profile saved successfully!</span>
              </div>
            )}
          </div>

          {!selectedBranch || !selectedBatch ? (
            <p className="text-sm text-muted-foreground">
              Please select both branch and batch to continue
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Semester Marks</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Add and manage course marks for each semester. You can enter marks manually by clicking "Add Course" even without assigning batch/branch.
            </p>
            {selectedBranch && selectedBatch && curriculum && curriculum.length > 0 && (
              <Alert className="mt-3 bg-green-50 border-green-200">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  Curriculum loaded! Courses from the curriculum will appear automatically.
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent>
            <Tabs value={String(currentSemester)} onValueChange={(v) => setCurrentSemester(Number(v))}>
              <TabsList className="grid grid-cols-4 lg:grid-cols-8 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <TabsTrigger key={sem} value={String(sem)}>
                    Sem {sem}
                  </TabsTrigger>
                ))}
              </TabsList>

              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <TabsContent key={sem} value={String(sem)} className="space-y-4">
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[70px] text-center">S.No</TableHead>
                        <TableHead className="min-w-[150px]">Course Code</TableHead>
                        <TableHead className="min-w-[300px]">Course Name</TableHead>
                        <TableHead className="min-w-[100px]">CIE Marks</TableHead>
                        <TableHead className="min-w-[100px]">SEE Marks</TableHead>
                        <TableHead className="min-w-[100px]">Total</TableHead>
                        <TableHead className="min-w-[100px]">Credits</TableHead>
                        <TableHead className="min-w-[100px]">Grade</TableHead>
                        <TableHead className="min-w-[120px]">Grade Point</TableHead>
                        <TableHead className="w-[80px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                            No courses added yet. Click "Add Course" to add a course.
                          </TableCell>
                        </TableRow>
                      ) : (
                        marks.map((mark, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-center text-base">{idx + 1}</TableCell>
                            <TableCell>
                              <Input
                                value={mark.course_code}
                                onChange={(e) => handleMarkChange(idx, 'course_code', e.target.value)}
                                placeholder="e.g. CS101"
                                className="h-11 bg-background text-base px-3 min-w-[140px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={mark.course_name}
                                onChange={(e) => handleMarkChange(idx, 'course_name', e.target.value)}
                                placeholder="e.g. Data Structures"
                                className="h-11 bg-background text-base px-3 min-w-[280px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={mark.cie_marks || ''}
                                onChange={(e) => handleMarkChange(idx, 'cie_marks', Number(e.target.value))}
                                min={0}
                                max={50}
                                placeholder="0-50"
                                className="h-11 bg-background text-base px-3 min-w-[90px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={mark.see_marks || ''}
                                onChange={(e) => handleMarkChange(idx, 'see_marks', Number(e.target.value))}
                                min={0}
                                max={100}
                                placeholder="0-100"
                                className="h-11 bg-background text-base px-3 min-w-[90px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={mark.total_marks || ''}
                                readOnly
                                className="h-11 bg-muted font-semibold text-base px-3 min-w-[90px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={mark.credits || ''}
                                onChange={(e) => handleMarkChange(idx, 'credits', Number(e.target.value))}
                                min={1}
                                max={10}
                                placeholder="1-10"
                                className="h-11 bg-background text-base px-3 min-w-[90px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={mark.grade}
                                onChange={(e) => handleMarkChange(idx, 'grade', e.target.value.toUpperCase())}
                                maxLength={3}
                                placeholder="S/A/B"
                                className="h-11 bg-background text-base px-3 min-w-[90px] uppercase text-center font-semibold"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={mark.grade_point || ''}
                                onChange={(e) => handleMarkChange(idx, 'grade_point', Number(e.target.value))}
                                min={0}
                                max={10}
                                step={0.1}
                                placeholder="0-10"
                                className="h-11 bg-background text-base px-3 min-w-[110px]"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteRow(idx)}
                                className="h-10 w-10 p-0 hover:bg-destructive/10 hover:text-destructive"
                                title="Delete this course"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t mt-4">
                    <div className="flex gap-6">
                      <div className="bg-primary/10 px-4 py-2 rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Credits</p>
                        <p className="text-2xl font-bold text-primary">{totalCredits}</p>
                      </div>
                      <div className="bg-primary/10 px-4 py-2 rounded-lg">
                        <p className="text-sm text-muted-foreground">SGPA</p>
                        <p className="text-2xl font-bold text-primary">{sgpa.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddRow} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Course
                      </Button>
                      <Button onClick={() => saveMarksMutation.mutate()} disabled={saveMarksMutation.isPending}>
                        {saveMarksMutation.isPending ? 'Saving...' : 'Save Marks'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
    </div>
  );
};

export default StudentDetailPage;
