import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { GraduationCap, LogOut, FileText, Users, GitBranch, Calendar, Menu, Home } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const COELayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { to: '/coe/requests', icon: FileText, label: 'Requests' },
    { to: '/coe/students', icon: Users, label: 'Students' },
    { to: '/coe/branches', icon: GitBranch, label: 'Branches' },
    { to: '/coe/batches', icon: Calendar, label: 'Batches' },
  ];

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn("space-y-2", mobile ? "p-4" : "p-4")}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => mobile && setSidebarOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile Menu Button */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="py-4">
                  <div className="px-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary rounded-lg">
                        <GraduationCap className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold">Certified Academic Records</h2>
                        <p className="text-xs text-muted-foreground">COE Portal</p>
                      </div>
                    </div>
                  </div>
                  <NavLinks mobile />
                </div>
              </SheetContent>
            </Sheet>

            <div className="p-2 bg-primary rounded-lg shrink-0">
              <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm md:text-lg font-bold truncate">Certified Academic Records System</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">COE Portal • {profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/')} size="sm" className="shrink-0">
              <Home className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Home</span>
            </Button>
            <Button variant="outline" onClick={() => signOut()} size="sm" className="shrink-0">
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 border-r bg-card shrink-0">
          <NavLinks />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto min-w-0">
          <div className="container mx-auto p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default COELayout;
