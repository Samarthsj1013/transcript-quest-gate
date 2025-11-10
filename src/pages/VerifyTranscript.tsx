import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';

const VerifyTranscript = () => {
  const { token } = useParams(); // This is actually the request ID

  const { data: verification, isLoading, error: queryError } = useQuery({
    queryKey: ['verify-transcript', token],
    queryFn: async () => {
      console.log('[Verify] Checking request ID:', token);

      const { data, error } = await supabase
        .from('transcript_requests')
        .select(`
          *,
          users!transcript_requests_student_id_fkey (
            name,
            usn,
            email,
            student_profiles!student_profiles_user_id_fkey (
              branches!student_profiles_branch_id_fkey (branch_name),
              academic_batches!student_profiles_batch_id_fkey (batch_year)
            )
          )
        `)
        .eq('id', token)
        .eq('status', 'APPROVED')
        .single();

      if (error) {
        console.error('[Verify] Database error:', error);
        throw error;
      }

      console.log('[Verify] Query result:', data ? 'Found' : 'Not found');
      if (data) {
        console.log('[Verify] Full data structure:', JSON.stringify(data, null, 2));
        console.log('[Verify] Users object:', (data as any).users);
        console.log('[Verify] Student profiles:', (data as any).users?.student_profiles);
      }

      return data;
    },
    enabled: !!token,
  });

  // Log any query errors
  if (queryError) {
    console.error('[Verify] Query error:', queryError);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  const isValid = !!verification;
  const studentInfo = (verification as any)?.users;

  // Handle both array and object returns from Supabase
  const profile = Array.isArray(studentInfo?.student_profiles)
    ? studentInfo.student_profiles[0]
    : studentInfo?.student_profiles;

  console.log('[Verify] Profile data:', {
    studentInfo,
    profile,
    branch: profile?.branches?.branch_name,
    batch: profile?.academic_batches?.batch_year,
    isArray: Array.isArray(studentInfo?.student_profiles)
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary rounded-full">
                <GraduationCap className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">GLOBAL ACADEMY OF TECHNOLOGY</CardTitle>
          </CardHeader>
          <CardContent>
            {isValid ? (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-3 p-6 bg-green-50 rounded-lg border-2 border-green-500">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <h2 className="text-2xl font-bold text-green-700">TRANSCRIPT VERIFIED</h2>
                    <p className="text-green-600">This transcript is authentic</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-6 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">USN</p>
                    <p className="font-semibold">{studentInfo?.usn || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-semibold">{studentInfo?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Branch</p>
                    <p className="font-semibold">{profile?.branches?.branch_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Batch</p>
                    <p className="font-semibold">{profile?.academic_batches?.batch_year || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Issue Date</p>
                    <p className="font-semibold">
                      {verification?.reviewed_at
                        ? format(new Date(verification.reviewed_at), 'MMM dd, yyyy')
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-3 p-6 bg-red-50 rounded-lg border-2 border-red-500">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div>
                    <h2 className="text-2xl font-bold text-red-700">VERIFICATION FAILED</h2>
                    <p className="text-red-600 mt-2">
                      This transcript could not be verified.
                      <br />
                      The QR code may be invalid or tampered.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyTranscript;
