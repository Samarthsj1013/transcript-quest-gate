import { useState } from 'react';
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
import { Trash2, Plus } from 'lucide-react';

type Curriculum = {
  id: string;
  course_code: string;
  course_name: string;
  credits: number;
  semester: number;
};

const BatchesPage = () => {
  const [batchYear, setBatchYear] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [currentSemester, setCurrentSemester] = useState(1);
  const [curriculumRows, setCurriculumRows] = useState<Partial<Curriculum>[]>([]);
  const queryClient = useQueryClient();

  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_batches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('branch_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: curriculum, isLoading: curriculumLoading } = useQuery({
    queryKey: ['curriculum', selectedBatch, selectedBranch, currentSemester],
    queryFn: async () => {
      if (!selectedBatch || !selectedBranch) return [];
      const { data, error } = await supabase
        .from('curriculum')
        .select('*')
        .eq('batch_id', selectedBatch)
        .eq('branch_id', selectedBranch)
        .eq('semester', currentSemester)
        .order('course_code');
      if (error) throw error;
      return data as Curriculum[];
    },
    enabled: !!selectedBatch && !!selectedBranch,
  });

  const createBatchMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('academic_batches')
        .insert({ batch_year: batchYear.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast({ title: 'Batch created successfully' });
      setBatchYear('');
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create batch', description: error.message, variant: 'destructive' });
    },
  });

  const saveCurriculumMutation = useMutation({
    mutationFn: async (rows: Partial<Curriculum>[]) => {
      // Delete existing curriculum for this semester
      await supabase
        .from('curriculum')
        .delete()
        .eq('batch_id', selectedBatch)
        .eq('branch_id', selectedBranch)
        .eq('semester', currentSemester);

      // Insert new curriculum
      const validRows = rows.filter(r => r.course_code && r.course_name && r.credits);
      if (validRows.length > 0) {
        const { error } = await supabase
          .from('curriculum')
          .insert(
            validRows.map(row => ({
              batch_id: selectedBatch,
              branch_id: selectedBranch,
              semester: currentSemester,
              course_code: row.course_code!,
              course_name: row.course_name!,
              credits: row.credits!,
            }))
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum'] });
      toast({ title: 'Curriculum saved successfully' });
      setCurriculumRows([]);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to save curriculum', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCurriculumMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('curriculum').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum'] });
      toast({ title: 'Course deleted successfully' });
    },
  });

  const handleAddRow = () => {
    setCurriculumRows([...curriculumRows, { course_code: '', course_name: '', credits: 0 }]);
  };

  const handleRemoveRow = (index: number) => {
    setCurriculumRows(curriculumRows.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: keyof Curriculum, value: any) => {
    const updated = [...curriculumRows];
    updated[index] = { ...updated[index], [field]: value };
    setCurriculumRows(updated);
  };

  const handleSaveCurriculum = () => {
    saveCurriculumMutation.mutate([...curriculum || [], ...curriculumRows]);
  };

  return (
    <div className="space-y-6">
      {/* Add Batch */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="batch-year">Batch Year (e.g., 2022-2026)</Label>
              <Input
                id="batch-year"
                placeholder="2022-2026"
                value={batchYear}
                onChange={(e) => setBatchYear(e.target.value)}
              />
            </div>
            <Button className="mt-6" onClick={() => createBatchMutation.mutate()} disabled={!batchYear.trim()}>
              Add Batch
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manage Curriculum */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Curriculum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Batch</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger>
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
            <div>
              <Label>Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
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
          </div>

          {selectedBatch && selectedBranch && (
            <Tabs value={String(currentSemester)} onValueChange={(v) => setCurrentSemester(Number(v))}>
              <TabsList className="grid grid-cols-4 lg:grid-cols-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <TabsTrigger key={sem} value={String(sem)}>
                    Sem {sem}
                  </TabsTrigger>
                ))}
              </TabsList>

              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <TabsContent key={sem} value={String(sem)} className="space-y-4">
                  {curriculumLoading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>S.No</TableHead>
                            <TableHead>Course Code</TableHead>
                            <TableHead>Course Name</TableHead>
                            <TableHead>Credits</TableHead>
                            <TableHead>Delete</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {curriculum?.map((course, idx) => (
                            <TableRow key={course.id}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>{course.course_code}</TableCell>
                              <TableCell>{course.course_name}</TableCell>
                              <TableCell>{course.credits}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteCurriculumMutation.mutate(course.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {curriculumRows.map((row, idx) => (
                            <TableRow key={`new-${idx}`}>
                              <TableCell>{(curriculum?.length || 0) + idx + 1}</TableCell>
                              <TableCell>
                                <Input
                                  value={row.course_code || ''}
                                  onChange={(e) => handleRowChange(idx, 'course_code', e.target.value)}
                                  placeholder="Course Code"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.course_name || ''}
                                  onChange={(e) => handleRowChange(idx, 'course_name', e.target.value)}
                                  placeholder="Course Name"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={row.credits || ''}
                                  onChange={(e) => handleRowChange(idx, 'credits', Number(e.target.value))}
                                  placeholder="Credits"
                                  min={1}
                                  max={10}
                                />
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" onClick={() => handleRemoveRow(idx)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="flex gap-2">
                        <Button onClick={handleAddRow}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Row
                        </Button>
                        <Button onClick={handleSaveCurriculum} disabled={curriculumRows.length === 0}>
                          Save Curriculum
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchesPage;
