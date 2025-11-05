import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { useToast } from '../components/ui/use-toast.jsx';
import { ArrowLeft, Users, UserCheck, Save } from 'lucide-react';
import Loading from '../components/Loading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';

export default function ChatAssignments() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [chatInfo, setChatInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentGroups, setStudentGroups] = useState([]);
  const [assignments, setAssignments] = useState({
    direct_students: [],
    group_students: [],
    assigned_groups: [],
  });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchChatInfo();
    fetchAssignments();
    fetchStudents();
    fetchStudentGroups();
  }, [chatId]);

  const fetchChatInfo = async () => {
    try {
      const response = await api.get('/ragflow/chats', {
        params: { id: chatId }
      });
      if (response.data.success && response.data.chats && response.data.chats.length > 0) {
        setChatInfo(response.data.chats[0]);
      }
    } catch (error) {
      console.error('Failed to fetch chat info:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await api.get(`/chats/${chatId}/students`);
      if (response.data.success) {
        setAssignments({
          direct_students: response.data.direct_students || [],
          group_students: response.data.group_students || [],
          assigned_groups: response.data.assigned_groups || [],
        });
        setSelectedStudents(response.data.direct_students?.map(s => s.id) || []);
        setSelectedGroups(response.data.assigned_groups?.map(g => g.id) || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to fetch assignments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await api.get('/students');
      // API returns {students: [...]} without success field
      if (response.data.students) {
        setStudents(response.data.students || []);
      } else if (Array.isArray(response.data)) {
        // Direct array response (fallback)
        setStudents(response.data || []);
      } else {
        console.error('Unexpected response format:', response.data);
        setStudents([]);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to fetch students',
        variant: 'destructive',
      });
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchStudentGroups = async () => {
    try {
      setLoadingGroups(true);
      const response = await api.get('/student-groups');
      // API returns {groups: [...]} without success field
      if (response.data.groups) {
        setStudentGroups(response.data.groups || []);
      } else if (Array.isArray(response.data)) {
        // Direct array response (fallback)
        setStudentGroups(response.data || []);
      } else {
        console.error('Unexpected response format:', response.data);
        setStudentGroups([]);
      }
    } catch (error) {
      console.error('Failed to fetch student groups:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to fetch student groups',
        variant: 'destructive',
      });
      setStudentGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSaveAssignments = async () => {
    try {
      setSaving(true);

      // Save student assignments
      if (selectedStudents.length > 0) {
        await api.post(`/chats/${chatId}/assign-students`, {
          student_ids: selectedStudents
        });
      } else {
        // If no students selected, remove all assignments
        await api.post(`/chats/${chatId}/assign-students`, {
          student_ids: []
        });
      }

      // Save group assignments
      if (selectedGroups.length > 0) {
        await api.post(`/chats/${chatId}/assign-groups`, {
          group_ids: selectedGroups
        });
      } else {
        // If no groups selected, remove all assignments
        await api.post(`/chats/${chatId}/assign-groups`, {
          group_ids: []
        });
      }

      toast({
        title: 'Success',
        description: 'Assignments saved successfully',
      });

      setDialogOpen(false);
      fetchAssignments();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save assignments',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleToggleGroup = (groupId) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/ragflow/chats')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Chat Assignments</h1>
            <p className="text-muted-foreground mt-2">
              {chatInfo?.name || `Chat ID: ${chatId}`}
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Save className="h-4 w-4 mr-2" />
          Manage Assignments
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Direct Student Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5" />
              <span>Directly Assigned Students</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.direct_students.length === 0 ? (
              <p className="text-muted-foreground text-sm">No students directly assigned</p>
            ) : (
              <div className="space-y-2">
                {assignments.direct_students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">
                        {student.first_name} {student.last_name}
                      </p>
                      {student.student_id && (
                        <p className="text-sm text-muted-foreground">
                          ID: {student.student_id}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Assigned Groups</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.assigned_groups.length === 0 ? (
              <p className="text-muted-foreground text-sm">No groups assigned</p>
            ) : (
              <div className="space-y-2">
                {assignments.assigned_groups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{group.name}</p>
                      {group.description && (
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Students via Groups */}
      {assignments.group_students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Students via Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Student ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.group_students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      {student.first_name} {student.last_name}
                    </TableCell>
                    <TableCell>{student.student_id || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Chat Assignments</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Students Selection */}
            <div>
              <h3 className="font-semibold mb-3">Assign to Students</h3>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                {loadingStudents ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">Loading students...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">No students available</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      No students found in the system
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {students.map((student) => (
                      <div key={student.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                        <Checkbox
                          id={`student-${student.id}`}
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => handleToggleStudent(student.id)}
                        />
                        <label 
                          htmlFor={`student-${student.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-medium">
                            {student.first_name} {student.last_name}
                          </span>
                          {student.student_id && (
                            <span className="text-sm text-muted-foreground ml-2">
                              (ID: {student.student_id})
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Groups Selection */}
            <div>
              <h3 className="font-semibold mb-3">Assign to Student Groups</h3>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                {loadingGroups ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">Loading groups...</p>
                  </div>
                ) : studentGroups.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">No groups available</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      No groups found in the system
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {studentGroups.map((group) => (
                      <div key={group.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={selectedGroups.includes(group.id)}
                          onCheckedChange={() => handleToggleGroup(group.id)}
                        />
                        <label 
                          htmlFor={`group-${group.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-medium">{group.name}</span>
                          {group.description && (
                            <span className="text-sm text-muted-foreground ml-2">
                              - {group.description}
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssignments} disabled={saving}>
              {saving ? 'Saving...' : 'Save Assignments'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

