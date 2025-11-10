import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const StudentsManagement = () => {
  const { data: students, isLoading } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          student_profiles!student_profiles_user_id_fkey (
            branches!student_profiles_branch_id_fkey (branch_name),
            academic_batches!student_profiles_batch_id_fkey (batch_year)
          )
        `)
        .eq('role', 'STUDENT')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

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
    <Card>
      <CardHeader>
        <CardTitle>Student Management</CardTitle>
        <CardDescription>View and manage all registered students</CardDescription>
      </CardHeader>
      <CardContent>
        {students && students.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>USN</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const profile = Array.isArray((student as any).student_profiles)
                  ? (student as any).student_profiles[0]
                  : (student as any).student_profiles;
                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell className="font-mono">{student.usn || 'N/A'}</TableCell>
                    <TableCell>{profile?.branches?.branch_name || 'Not Assigned'}</TableCell>
                    <TableCell>{profile?.academic_batches?.batch_year || 'Not Assigned'}</TableCell>
                    <TableCell>{new Date(student.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No students registered yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentsManagement;
