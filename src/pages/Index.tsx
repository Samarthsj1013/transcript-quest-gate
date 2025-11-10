import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, FileText, Shield, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-bold">Certified Academic Records System</h1>
              <p className="text-xs text-muted-foreground hidden md:block">Global Academy of Technology</p>
            </div>
          </div>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Certified Academic Records System
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A comprehensive platform for students and administrators to manage academic transcripts, marks, and requests securely.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardContent className="pt-6">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Student Portal</h3>
              <p className="text-muted-foreground">
                View your marks, track CGPA, and request official transcripts anytime.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">COE Management</h3>
              <p className="text-muted-foreground">
                Efficiently manage student records, approve transcripts, and maintain data integrity.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Transcript Requests</h3>
              <p className="text-muted-foreground">
                Streamlined process for requesting and tracking academic transcript approvals.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-card rounded-lg p-8 md:p-12">
          <h3 className="text-2xl font-bold mb-6 text-center">Key Features</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-3">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Secure Authentication</h4>
                <p className="text-muted-foreground text-sm">
                  Role-based access control ensures data privacy and security
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Real-time Updates</h4>
                <p className="text-muted-foreground text-sm">
                  Get instant notifications on transcript request status
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Comprehensive Records</h4>
                <p className="text-muted-foreground text-sm">
                  View detailed semester-wise marks and grade points
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Easy Management</h4>
                <p className="text-muted-foreground text-sm">
                  Intuitive interface for both students and administrators
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t bg-card/50 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
          <p>&copy; 2025 Certified Academic Records System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
