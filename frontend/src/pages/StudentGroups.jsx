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
import { cn } from '../lib/utils';
import { MultiSelect } from '../components/ui/multi-select';

export default function StudentGroups() {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    student_ids: [],
    instructor_ids: [],
  });
  const { toast } = useToast();
  const { t } = useTranslation();

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
        title: t('toast.error'),
        description: t('studentGroups.failedToFetch'),
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
          title: t('toast.success'),
          description: t('studentGroups.groupUpdated'),
        });
      } else {
        await api.post('/student-groups', submitData);
        toast({
          title: t('toast.success'),
          description: t('studentGroups.groupCreated'),
        });
      }
      setDialogOpen(false);
      resetForm();
      fetchGroups();
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('studentGroups.operationFailed'),
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
    if (!window.confirm(t('studentGroups.deleteConfirm'))) {
      return;
    }
    try {
      await api.delete(`/student-groups/${id}`);
      toast({
        title: t('toast.success'),
        description: t('studentGroups.groupDeleted'),
      });
      fetchGroups();
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: t('studentGroups.failedToDelete'),
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


  const handleViewDetails = (group) => {
    setSelectedGroupDetails(group);
    setDetailsDialogOpen(true);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('studentGroups.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('studentGroups.subtitle')}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('studentGroups.addGroup')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.description')}</TableHead>
                <TableHead>{t('studentGroups.students')}</TableHead>
                <TableHead>{t('studentGroups.instructors')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">{t('studentGroups.noGroupsFound')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>
                      {group.description ? (
                        <span className="text-sm text-muted-foreground">{group.description}</span>
                      ) : (
                        <span className="text-muted-foreground italic text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                        group.students?.length > 0 
                          ? "bg-blue-100 text-blue-800 border-blue-200" 
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      )}>
                        {group.students?.length || 0} {t('studentGroups.students')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                        group.instructors?.length > 0 
                          ? "bg-green-100 text-green-800 border-green-200" 
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      )}>
                        {group.instructors?.length || 0} {t('studentGroups.instructors')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(group)}
                          className="h-8 w-8"
                          title={t('studentGroups.viewDetails')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(group)}
                          className="h-8 w-8"
                          title={t('common.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(group.id)}
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
              {editingGroup ? t('studentGroups.editGroup') : t('studentGroups.addNewGroup')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('studentGroups.groupName')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('common.description')}</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('studentGroups.students')}</Label>
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">{t('studentGroups.noStudentsAvailable')}</p>
                ) : (
                  <MultiSelect
                    options={students.map((student) => ({
                      value: student.id,
                      label: `${student.first_name} ${student.last_name}${student.student_id ? ` (${student.student_id})` : ''}`,
                    }))}
                    selected={formData.student_ids}
                    onChange={(selectedIds) => {
                      setFormData({ ...formData, student_ids: selectedIds });
                    }}
                    placeholder={t('studentGroups.selectStudents') || "Select students..."}
                    searchPlaceholder={t('studentGroups.searchStudents') || "Search students..."}
                    emptyMessage={t('studentGroups.noStudentsFound') || "No students found"}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('studentGroups.instructors')}</Label>
                {instructors.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">{t('studentGroups.noInstructorsAvailable')}</p>
                ) : (
                  <MultiSelect
                    options={instructors.map((instructor) => ({
                      value: instructor.id,
                      label: `${instructor.first_name} ${instructor.last_name}`,
                    }))}
                    selected={formData.instructor_ids}
                    onChange={(selectedIds) => {
                      setFormData({ ...formData, instructor_ids: selectedIds });
                    }}
                    placeholder={t('studentGroups.selectInstructors') || "Select instructors..."}
                    searchPlaceholder={t('studentGroups.searchInstructors') || "Search instructors..."}
                    emptyMessage={t('studentGroups.noInstructorsFound') || "No instructors found"}
                  />
                )}
              </div>
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

      {/* Group Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('studentGroups.groupDetails')} - {selectedGroupDetails?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedGroupDetails && (
            <div className="space-y-6 py-4">
              {/* Description */}
              {selectedGroupDetails.description && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">{t('common.description')}</h3>
                  <p className="text-sm text-muted-foreground">{selectedGroupDetails.description}</p>
                </div>
              )}

              {/* Students Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {t('studentGroups.students')} ({selectedGroupDetails.students?.length || 0})
                </h3>
                {selectedGroupDetails.students?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedGroupDetails.students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-blue-50/50 border-blue-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-700">
                              {student.first_name?.[0]}{student.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {student.first_name} {student.last_name}
                            </p>
                            {student.student_id && (
                              <p className="text-xs text-muted-foreground">
                                {t('students.studentId')}: {student.student_id}
                              </p>
                            )}
                            {student.user?.email && (
                              <p className="text-xs text-muted-foreground">
                                {student.user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {t('studentGroups.noStudentsInGroup')}
                  </p>
                )}
              </div>

              {/* Instructors Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {t('studentGroups.instructors')} ({selectedGroupDetails.instructors?.length || 0})
                </h3>
                {selectedGroupDetails.instructors?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedGroupDetails.instructors.map((instructor) => (
                      <div
                        key={instructor.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50 border-green-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-green-700">
                              {instructor.first_name?.[0]}{instructor.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {instructor.first_name} {instructor.last_name}
                            </p>
                            {instructor.user?.email && (
                              <p className="text-xs text-muted-foreground">
                                {instructor.user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {t('studentGroups.noInstructorsInGroup')}
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

