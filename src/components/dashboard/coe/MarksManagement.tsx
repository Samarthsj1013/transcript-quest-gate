import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

const MarksManagement = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Marks Management</CardTitle>
        <CardDescription>Upload and manage student marks</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Marks management functionality will be available soon. You can currently view and manage students and transcript requests.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default MarksManagement;
