import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings } from 'lucide-react';

type Student = {
  id: string;
  name: string;
  email: string;
  usn: string | null;
  student_profiles: {
    branch_id: string | null;
    batch_id: string | null;
    branches: { branch_name: string } | null;
    academic_batches: { batch_year: string } | null;
  }[];
};

const StudentsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      console.log('[Students List] Fetching all students...');

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
        .eq('role', 'STUDENT')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Students List] Error:', error);
        throw error;
      }

      console.log('[Students List] Fetched', data?.length, 'students');
      if (data && data.length > 0) {
        console.log('[Students List] Sample student data:', {
          name: data[0].name,
          profile: data[0].student_profiles?.[0],
          branch: data[0].student_profiles?.[0]?.branches?.branch_name,
          batch: data[0].student_profiles?.[0]?.academic_batches?.batch_year,
        });
      }

      return data as any;
    },
  });

  const filteredStudents = students?.filter((student) => {
    const search = searchTerm.toLowerCase();
    return (
      student.name.toLowerCase().includes(search) ||
      student.usn?.toLowerCase().includes(search) ||
      student.email.toLowerCase().includes(search)
    );
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Students Management</CardTitle>
        <Input
          placeholder="Search by USN or Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md mt-2"
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>USN</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No students found
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents?.map((student) => {
                const profile = Array.isArray(student.student_profiles)
                  ? student.student_profiles[0]
                  : student.student_profiles;
                return (
                  <TableRow key={student.id}>
                    <TableCell>{student.usn || 'N/A'}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      {profile?.branches?.branch_name || 'Not assigned'}
                    </TableCell>
                    <TableCell>
                      {profile?.academic_batches?.batch_year || 'Not assigned'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/coe/students/${student.id}`)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default StudentsPage;
