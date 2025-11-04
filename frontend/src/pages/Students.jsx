import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
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

export default function Students() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    student_id: '',
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    group_ids: [],
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
    fetchGroups();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      setStudents(response.data.students);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await api.get('/student-groups');
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        group_ids: formData.group_ids.map(Number),
      };
      
      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, submitData);
        toast({
          title: 'Success',
          description: 'Student updated successfully',
        });
      } else {
        await api.post('/students', submitData);
        toast({
          title: 'Success',
          description: 'Student created successfully',
        });
      }
      setDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Operation failed',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      email: student.user?.email || '',
      password: '',
      student_id: student.student_id || '',
      first_name: student.first_name,
      last_name: student.last_name,
      phone: student.phone || '',
      date_of_birth: student.date_of_birth || '',
      group_ids: student.groups?.map(g => g.id) || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }
    try {
      await api.delete(`/students/${id}`);
      toast({
        title: 'Success',
        description: 'Student deleted successfully',
      });
      fetchStudents();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete student',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      student_id: '',
      first_name: '',
      last_name: '',
      phone: '',
      date_of_birth: '',
      group_ids: [],
    });
    setEditingStudent(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const toggleGroup = (groupId) => {
    setFormData({
      ...formData,
      group_ids: formData.group_ids.includes(groupId)
        ? formData.group_ids.filter(id => id !== groupId)
        : [...formData.group_ids, groupId],
    });
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground mt-2">Manage all students in the system</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Student
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
                <TableHead>Date of Birth</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.student_id || '-'}
                    </TableCell>
                    <TableCell>
                      {student.first_name} {student.last_name}
                    </TableCell>
                    <TableCell>{student.user?.email}</TableCell>
                    <TableCell>{student.phone || '-'}</TableCell>
                    <TableCell>{student.date_of_birth || '-'}</TableCell>
                    <TableCell>
                      {student.groups?.length > 0
                        ? student.groups.map(g => g.name).join(', ')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(student)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(student.id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStudent ? 'Edit Student' : 'Add New Student'}
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
                Password {editingStudent && '(leave empty to keep current)'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingStudent}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student_id">Student ID</Label>
              <Input
                id="student_id"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                placeholder="e.g., STU001, 2024001"
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Student Groups</Label>
              <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No groups available</p>
                ) : (
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <label key={group.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.group_ids.includes(group.id)}
                          onChange={() => toggleGroup(group.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{group.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
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

