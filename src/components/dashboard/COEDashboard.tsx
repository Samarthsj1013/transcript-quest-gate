import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GraduationCap, LogOut } from 'lucide-react';
import StudentsManagement from './coe/StudentsManagement';
import TranscriptRequests from './coe/TranscriptRequests';
import MarksManagement from './coe/MarksManagement';

const COEDashboard = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">COE Portal</h1>
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
        <Tabs defaultValue="students" className="space-y-6">
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="marks">Marks Management</TabsTrigger>
            <TabsTrigger value="transcripts">Transcript Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <StudentsManagement />
          </TabsContent>

          <TabsContent value="marks">
            <MarksManagement />
          </TabsContent>

          <TabsContent value="transcripts">
            <TranscriptRequests />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default COEDashboard;
