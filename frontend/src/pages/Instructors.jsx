import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast.jsx';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Loading from '../components/Loading';

export default function Instructors() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    ragflow_api_key: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      const response = await api.get('/instructors');
      setInstructors(response.data.instructors);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch instructors';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      // If it's a 401, don't set loading to false - let the interceptor handle redirect
      if (error.response?.status !== 401) {
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingInstructor) {
        await api.put(`/instructors/${editingInstructor.id}`, formData);
        toast({
          title: 'Success',
          description: 'Instructor updated successfully',
        });
      } else {
        await api.post('/instructors', formData);
        toast({
          title: 'Success',
          description: 'Instructor created successfully',
        });
      }
      setDialogOpen(false);
      resetForm();
      fetchInstructors();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Operation failed',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (instructor) => {
    setEditingInstructor(instructor);
    setFormData({
      email: instructor.user?.email || '',
      password: '',
      first_name: instructor.first_name,
      last_name: instructor.last_name,
      phone: instructor.phone || '',
      ragflow_api_key: instructor.ragflow_api_key || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this instructor?')) {
      return;
    }
    try {
      await api.delete(`/instructors/${id}`);
      toast({
        title: 'Success',
        description: 'Instructor deleted successfully',
      });
      fetchInstructors();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete instructor',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      ragflow_api_key: '',
    });
    setEditingInstructor(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Instructors</h1>
          <p className="text-muted-foreground mt-2">Manage all instructors in the system</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Instructor
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>RAGFlow API Key</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No instructors found
                  </TableCell>
                </TableRow>
              ) : (
                instructors.map((instructor) => (
                  <TableRow key={instructor.id}>
                    <TableCell>
                      {instructor.first_name} {instructor.last_name}
                    </TableCell>
                    <TableCell>{instructor.user?.email}</TableCell>
                    <TableCell>{instructor.phone || '-'}</TableCell>
                    <TableCell>
                      {instructor.ragflow_api_key ? (
                        <span className="text-xs text-green-600">✓ Configured</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(instructor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(instructor.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingInstructor ? 'Edit Instructor' : 'Add New Instructor'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password {editingInstructor && '(leave empty to keep current)'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingInstructor}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ragflow_api_key">RAGFlow API Key</Label>
              <Input
                id="ragflow_api_key"
                type="password"
                value={formData.ragflow_api_key}
                onChange={(e) => setFormData({ ...formData, ragflow_api_key: e.target.value })}
                placeholder="Enter RAGFlow API key for this instructor"
              />
              <p className="text-xs text-muted-foreground">
                This API key will be used when this instructor creates datasets in RAGFlow
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

