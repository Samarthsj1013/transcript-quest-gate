import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, AlertCircle } from 'lucide-react';

const RequestTranscript = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);

  const { data: studentInfo, isLoading } = useQuery({
    queryKey: ['student-info', profile?.id],
    queryFn: async () => {
      console.log('[Request Transcript] Fetching student info for:', profile?.id);

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
        console.error('[Request Transcript] Error:', error);
        throw error;
      }

      console.log('[Request Transcript] Student data:', {
        name: data.name,
        profiles: data.student_profiles,
        branch: data.student_profiles?.[0]?.branches?.branch_name,
        batch: data.student_profiles?.[0]?.academic_batches?.batch_year,
      });

      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: pendingRequest } = useQuery({
    queryKey: ['pending-request', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcript_requests')
        .select('*')
        .eq('student_id', profile?.id)
        .eq('status', 'PENDING')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('transcript_requests').insert({
        student_id: profile?.id,
        status: 'PENDING',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Request submitted successfully!', description: 'Your request is now pending COE approval' });
      navigate('/student/dashboard');
    },
    onError: (error: any) => {
      toast({ title: 'Failed to submit request', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (!verified) return;
    submitRequestMutation.mutate();
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const profileData = studentInfo?.student_profiles?.[0];
  const branch = profileData?.branches?.branch_name;
  const batch = profileData?.academic_batches?.batch_year;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/student/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Request Transcript</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {pendingRequest ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You already have a pending transcript request. Please wait for COE approval.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-4">
                  <p className="text-sm font-medium">Verify Your Details:</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{studentInfo?.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">USN</Label>
                      <p className="font-medium">{studentInfo?.usn || 'Not assigned'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{studentInfo?.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Branch</Label>
                      <p className="font-medium">{branch || 'Will be assigned by COE'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Batch</Label>
                      <p className="font-medium">{batch || 'Will be assigned by COE'}</p>
                    </div>
                  </div>

                  {(!branch || !batch) && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900">
                        <strong>No worries!</strong> Your branch and batch will be assigned by the Chief of Examination (COE) when processing your request. You can submit your request now.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex items-center space-x-2 py-4 border-t">
                  <Checkbox id="verify" checked={verified} onCheckedChange={(checked) => setVerified(!!checked)} />
                  <label htmlFor="verify" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I verify that my name, USN and email are correct
                  </label>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={!verified || submitRequestMutation.isPending}
                    className="flex-1"
                  >
                    {submitRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/student/dashboard')} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequestTranscript;
