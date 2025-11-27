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
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import Loading from '../components/Loading';
import { useTranslation } from 'react-i18next';
import { MultiSelect } from '../components/ui/multi-select';
import { cn } from '../lib/utils';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
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
  const { t } = useTranslation();

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
        title: t('toast.error'),
        description: t('students.failedToFetch'),
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
          title: t('toast.success'),
          description: t('students.studentUpdated'),
        });
      } else {
        await api.post('/students', submitData);
        toast({
          title: t('toast.success'),
          description: t('students.studentCreated'),
        });
      }
      setDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('students.operationFailed'),
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
    if (!window.confirm(t('students.deleteConfirm'))) {
      return;
    }
    try {
      await api.delete(`/students/${id}`);
      toast({
        title: t('toast.success'),
        description: t('students.studentDeleted'),
      });
      fetchStudents();
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: t('students.failedToDelete'),
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

  const handleViewDetails = (student) => {
    setSelectedStudentDetails(student);
    setDetailsDialogOpen(true);
  };


  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('students.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('students.subtitle')}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('students.addStudent')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('students.studentId')}</TableHead>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.email')}</TableHead>
                <TableHead>{t('common.phone')}</TableHead>
                <TableHead>{t('students.dateOfBirth')}</TableHead>
                <TableHead>{t('students.groups')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">{t('students.noStudentsFound')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {student.student_id || (
                        <span className="text-muted-foreground italic">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.first_name} {student.last_name}
                    </TableCell>
                    <TableCell>{student.user?.email || '-'}</TableCell>
                    <TableCell>{student.phone || (
                      <span className="text-muted-foreground">-</span>
                    )}</TableCell>
                    <TableCell>
                      {student.date_of_birth ? (
                        new Date(student.date_of_birth).toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {student.groups?.length > 0 ? (
                        student.groups.length > 2 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            {student.groups.length} {t('students.groups')}
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {student.groups.map((group) => (
                              <span
                                key={group.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                              >
                                {group.name}
                              </span>
                            ))}
                          </div>
                        )
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(student)}
                          className="h-8 w-8"
                          title={t('students.viewDetails')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(student)}
                          className="h-8 w-8"
                          title={t('common.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(student.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
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
              {editingStudent ? t('students.editStudent') : t('students.addNewStudent')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('common.email')}</Label>
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
                {editingStudent ? t('students.passwordLeaveEmpty') : t('common.password')}
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
              <Label htmlFor="student_id">{t('students.studentId')}</Label>
              <Input
                id="student_id"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                placeholder={t('students.studentIdPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">{t('students.firstName')}</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">{t('students.lastName')}</Label>
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
                <Label htmlFor="phone">{t('common.phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">{t('students.dateOfBirth')}</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('students.groups')}</Label>
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">{t('students.noGroupsAvailable')}</p>
              ) : (
                <MultiSelect
                  options={groups.map((group) => ({
                    value: group.id,
                    label: group.name,
                  }))}
                  selected={formData.group_ids}
                  onChange={(selectedIds) => {
                    setFormData({ ...formData, group_ids: selectedIds });
                  }}
                  placeholder={t('students.selectGroups') || "Select groups..."}
                  searchPlaceholder={t('students.searchGroups') || "Search groups..."}
                  emptyMessage={t('students.noGroupsFound') || "No groups found"}
                />
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('students.studentDetails')} - {selectedStudentDetails?.first_name} {selectedStudentDetails?.last_name}
            </DialogTitle>
          </DialogHeader>
          {selectedStudentDetails && (
            <div className="space-y-6 py-4">
              {/* Personal Information */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t('students.personalInformation')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('students.studentId')}</p>
                    <p className="text-sm font-medium">
                      {selectedStudentDetails.student_id || (
                        <span className="text-muted-foreground italic">-</span>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('common.name')}</p>
                    <p className="text-sm font-medium">
                      {selectedStudentDetails.first_name} {selectedStudentDetails.last_name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('common.email')}</p>
                    <p className="text-sm font-medium">
                      {selectedStudentDetails.user?.email || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('common.phone')}</p>
                    <p className="text-sm font-medium">
                      {selectedStudentDetails.phone || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('students.dateOfBirth')}</p>
                    <p className="text-sm font-medium">
                      {selectedStudentDetails.date_of_birth ? (
                        new Date(selectedStudentDetails.date_of_birth).toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Groups Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {t('students.groups')} ({selectedStudentDetails.groups?.length || 0})
                </h3>
                {selectedStudentDetails.groups?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudentDetails.groups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-primary/5 border-primary/20"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {group.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{group.name}</p>
                            {group.description && (
                              <p className="text-xs text-muted-foreground">{group.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          {group.students && (
                            <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">
                              {group.students.length} {t('studentGroups.students')}
                            </span>
                          )}
                          {group.instructors && (
                            <span className="px-2 py-1 rounded bg-green-100 text-green-700">
                              {group.instructors.length} {t('studentGroups.instructors')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {t('students.noGroupsAssigned')}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


