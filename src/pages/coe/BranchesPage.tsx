import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Branch = {
  id: string;
  branch_code: string;
  branch_name: string;
  created_at: string;
};

const BranchesPage = () => {
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Branch[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('branches')
        .insert({ branch_code: branchCode.trim(), branch_name: branchName.trim() });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast({ title: 'Branch created successfully' });
      setBranchCode('');
      setBranchName('');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create branch', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, code, name }: { id: string; code: string; name: string }) => {
      const { error } = await supabase
        .from('branches')
        .update({ branch_code: code.trim(), branch_name: name.trim() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast({ title: 'Branch updated successfully' });
      setEditingId(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update branch', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast({ title: 'Branch deleted successfully' });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete branch', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const handleCreate = () => {
    if (branchCode.trim() && branchName.trim()) {
      createMutation.mutate();
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingId(branch.id);
    setEditCode(branch.branch_code);
    setEditName(branch.branch_name);
  };

  const handleSaveEdit = () => {
    if (editingId && editCode.trim() && editName.trim()) {
      updateMutation.mutate({ id: editingId, code: editCode, name: editName });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCode('');
    setEditName('');
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Add Branch Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Branch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="branch-code">Branch Code</Label>
              <Input
                id="branch-code"
                placeholder="e.g., CSE"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                maxLength={20}
              />
            </div>
            <div>
              <Label htmlFor="branch-name">Branch Name</Label>
              <Input
                id="branch-name"
                placeholder="e.g., Computer Science Engineering"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                maxLength={255}
              />
            </div>
          </div>
          <Button 
            className="mt-4" 
            onClick={handleCreate}
            disabled={!branchCode.trim() || !branchName.trim()}
          >
            Add Branch
          </Button>
        </CardContent>
      </Card>

      {/* Branches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Branches</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch Code</TableHead>
                <TableHead>Branch Name</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No branches found
                  </TableCell>
                </TableRow>
              ) : (
                branches?.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      {editingId === branch.id ? (
                        <Input
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          maxLength={20}
                        />
                      ) : (
                        branch.branch_code
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === branch.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={255}
                        />
                      ) : (
                        branch.branch_name
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(branch.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {editingId === branch.id ? (
                          <>
                            <Button size="sm" onClick={handleSaveEdit}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(branch)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => setDeleteId(branch.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this branch? This will also delete all associated curriculum data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BranchesPage;
