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

export default function StudentGroups() {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    student_ids: [],
    instructor_ids: [],
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchGroups();
    fetchStudents();
    fetchInstructors();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/student-groups');
      setGroups(response.data.groups);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch student groups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      setStudents(response.data.students);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchInstructors = async () => {
    try {
      const response = await api.get('/instructors');
      setInstructors(response.data.instructors);
    } catch (error) {
      console.error('Failed to fetch instructors:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        student_ids: formData.student_ids.map(Number),
        instructor_ids: formData.instructor_ids.map(Number),
      };
      
      if (editingGroup) {
        await api.put(`/student-groups/${editingGroup.id}`, submitData);
        toast({
          title: 'Success',
          description: 'Student group updated successfully',
        });
      } else {
        await api.post('/student-groups', submitData);
        toast({
          title: 'Success',
          description: 'Student group created successfully',
        });
      }
      setDialogOpen(false);
      resetForm();
      fetchGroups();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Operation failed',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      student_ids: group.students?.map(s => s.id) || [],
      instructor_ids: group.instructors?.map(i => i.id) || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student group?')) {
      return;
    }
    try {
      await api.delete(`/student-groups/${id}`);
      toast({
        title: 'Success',
        description: 'Student group deleted successfully',
      });
      fetchGroups();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete student group',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      student_ids: [],
      instructor_ids: [],
    });
    setEditingGroup(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const toggleStudent = (studentId) => {
    setFormData({
      ...formData,
      student_ids: formData.student_ids.includes(studentId)
        ? formData.student_ids.filter(id => id !== studentId)
        : [...formData.student_ids, studentId],
    });
  };

  const toggleInstructor = (instructorId) => {
    setFormData({
      ...formData,
      instructor_ids: formData.instructor_ids.includes(instructorId)
        ? formData.instructor_ids.filter(id => id !== instructorId)
        : [...formData.instructor_ids, instructorId],
    });
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Student Groups</h1>
          <p className="text-muted-foreground mt-2">Organize students into groups</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Group
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Instructors</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No student groups found
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.description || '-'}</TableCell>
                    <TableCell>{group.students?.length || 0}</TableCell>
                    <TableCell>{group.instructors?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(group)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(group.id)}
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
              {editingGroup ? 'Edit Student Group' : 'Add New Student Group'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Students</Label>
                <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                  {students.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No students available</p>
                  ) : (
                    <div className="space-y-2">
                      {students.map((student) => (
                        <label key={student.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.student_ids.includes(student.id)}
                            onChange={() => toggleStudent(student.id)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">
                            {student.first_name} {student.last_name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Instructors</Label>
                <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                  {instructors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No instructors available</p>
                  ) : (
                    <div className="space-y-2">
                      {instructors.map((instructor) => (
                        <label key={instructor.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.instructor_ids.includes(instructor.id)}
                            onChange={() => toggleInstructor(instructor.id)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">
                            {instructor.first_name} {instructor.last_name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
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

