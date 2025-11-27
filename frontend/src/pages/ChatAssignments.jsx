import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { useToast } from '../components/ui/use-toast.jsx';
import { ArrowLeft, Users, UserCheck, Save, GraduationCap, BookOpen, MessageSquare, BarChart3, Trash2, UserCircle } from 'lucide-react';
import Loading from '../components/Loading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { MultiSelect } from '../components/ui/multi-select';
import { Label } from '../components/ui/label';
import { useTranslation } from 'react-i18next';

export default function ChatAssignments() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const [groupDetailsDialogOpen, setGroupDetailsDialogOpen] = useState(false);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [loadingGroupDetails, setLoadingGroupDetails] = useState(false);
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
        title: t('toast.error'),
        description: error.response?.data?.error || t('chatAssignments.failedToFetch'),
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
      if (response.data.students) {
        setStudents(response.data.students || []);
      } else if (Array.isArray(response.data)) {
        setStudents(response.data || []);
      } else {
        console.error('Unexpected response format:', response.data);
        setStudents([]);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('chatAssignments.failedToFetchStudents'),
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
      if (response.data.groups) {
        setStudentGroups(response.data.groups || []);
      } else if (Array.isArray(response.data)) {
        setStudentGroups(response.data || []);
      } else {
        console.error('Unexpected response format:', response.data);
        setStudentGroups([]);
      }
    } catch (error) {
      console.error('Failed to fetch student groups:', error);
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('chatAssignments.failedToFetchGroups'),
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
      await api.post(`/chats/${chatId}/assign-students`, {
        student_ids: selectedStudents
      });

      // Save group assignments
      await api.post(`/chats/${chatId}/assign-groups`, {
        group_ids: selectedGroups
      });

      toast({
        title: t('toast.success'),
        description: t('chatAssignments.assignmentsSaved'),
      });

      setDialogOpen(false);
      fetchAssignments();
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('chatAssignments.failedToSave'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStudent = (studentId) => {
    setSelectedStudents(prev => prev.filter(id => id !== studentId));
  };

  const handleRemoveGroup = (groupId) => {
    setSelectedGroups(prev => prev.filter(id => id !== groupId));
  };

  const handleViewGroupDetails = async (group) => {
    try {
      setLoadingGroupDetails(true);
      setSelectedGroupDetails(group);
      
      // Fetch full group details including students and instructors
      const response = await api.get('/student-groups', {
        params: { id: group.id }
      });
      
      if (response.data.groups && response.data.groups.length > 0) {
        const fullGroupDetails = response.data.groups[0];
        setSelectedGroupDetails(fullGroupDetails);
      } else if (response.data.success && response.data.group) {
        setSelectedGroupDetails(response.data.group);
      }
      
      setGroupDetailsDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch group details:', error);
      // Still show dialog with basic info if fetch fails
      setSelectedGroupDetails(group);
      setGroupDetailsDialogOpen(true);
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('chatAssignments.failedToFetchGroupDetails'),
        variant: 'destructive',
      });
    } finally {
      setLoadingGroupDetails(false);
    }
  };

  // Prepare options for MultiSelect components
  const studentOptions = students.map(student => ({
    value: student.id,
    label: `${student.first_name} ${student.last_name}${student.student_id ? ` (${student.student_id})` : ''}`
  }));

  const groupOptions = studentGroups.map(group => ({
    value: group.id,
    label: group.description ? `${group.name} - ${group.description}` : group.name
  }));

  // Calculate summary statistics
  const totalDirectStudents = assignments.direct_students.length;
  const totalGroups = assignments.assigned_groups.length;
  const totalAssignedStudents = totalDirectStudents;

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/ragflow/chats')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-3">
            {chatInfo?.avatar ? (
              <img 
                src={chatInfo.avatar} 
                alt={chatInfo.name || 'Chat'} 
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/10"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{t('chatAssignments.title')}</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {chatInfo?.name || `Chat ID: ${chatId}`}
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Save className="h-4 w-4 mr-2" />
          {t('chatAssignments.manageAssignments')}
        </Button>
      </div>

      {/* Summary Statistics */}
      <Card className="shadow-sm border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>{t('chatAssignments.summary')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">
                  {t('chatAssignments.totalDirectStudents')}
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{totalDirectStudents}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">
                  {t('chatAssignments.totalGroups')}
                </span>
              </div>
              <p className="text-2xl font-bold text-green-600">{totalGroups}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  {t('chatAssignments.totalAssignedStudents')}
                </span>
              </div>
              <p className="text-2xl font-bold text-primary">{totalAssignedStudents}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Direct Student Assignments */}
        <Card className="shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <span>{t('chatAssignments.directlyAssignedStudents')}</span>
              {totalDirectStudents > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalDirectStudents}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {t('chatAssignments.directlyAssignedStudents')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.direct_students.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground text-sm">
                  {t('chatAssignments.noStudentsDirectlyAssigned')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.direct_students.map((student) => (
                  <div 
                    key={student.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-white"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {student.first_name} {student.last_name}
                        </p>
                        {student.student_id && (
                          <p className="text-sm text-muted-foreground">
                            {t('students.studentId')}: {student.student_id}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group Assignments */}
        <Card className="shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <span>{t('chatAssignments.assignedGroups')}</span>
              {totalGroups > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalGroups}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {t('chatAssignments.assignedGroups')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.assigned_groups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground text-sm">
                  {t('chatAssignments.noGroupsAssigned')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.assigned_groups.map((group) => (
                  <div 
                    key={group.id} 
                    onClick={() => handleViewGroupDetails(group)}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-white cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{group.name}</p>
                        {group.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('chatAssignments.manageAssignments')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Students Selection */}
            <div className="space-y-3">
              <Label htmlFor="students-select" className="text-base font-semibold">
                {t('chatAssignments.assignToStudents')}
              </Label>
              {loadingStudents ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    {t('chatAssignments.loadingStudents')}
                  </p>
                </div>
              ) : (
                <MultiSelect
                  options={studentOptions}
                  selected={selectedStudents}
                  onChange={setSelectedStudents}
                  placeholder={t('chatAssignments.selectStudents')}
                  searchPlaceholder={t('chatAssignments.searchStudents')}
                  emptyMessage={t('chatAssignments.noStudentsAvailable')}
                  className="w-full"
                />
              )}
              
              {/* Assigned Students Table */}
              {selectedStudents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">
                    {t('chatAssignments.assignedStudents')} ({selectedStudents.length})
                  </Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">{t('chatAssignments.studentName')}</TableHead>
                          <TableHead className="font-semibold">{t('chatAssignments.studentId')}</TableHead>
                          <TableHead className="font-semibold text-right w-[100px]">{t('chatAssignments.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedStudents.map((studentId) => {
                          const student = students.find(s => s.id === studentId);
                          if (!student) return null;
                          return (
                            <TableRow key={studentId} className="hover:bg-muted/50">
                              <TableCell className="font-medium">
                                {student.first_name} {student.last_name}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {student.student_id || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveStudent(studentId)}
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>

            {/* Groups Selection */}
            <div className="space-y-3">
              <Label htmlFor="groups-select" className="text-base font-semibold">
                {t('chatAssignments.assignToStudentGroups')}
              </Label>
              {loadingGroups ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    {t('chatAssignments.loadingGroups')}
                  </p>
                </div>
              ) : (
                <MultiSelect
                  options={groupOptions}
                  selected={selectedGroups}
                  onChange={setSelectedGroups}
                  placeholder={t('chatAssignments.selectGroups')}
                  searchPlaceholder={t('chatAssignments.searchGroups')}
                  emptyMessage={t('chatAssignments.noGroupsAvailable')}
                  className="w-full"
                />
              )}
              
              {/* Assigned Groups Table */}
              {selectedGroups.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">
                    {t('chatAssignments.assignedGroups')} ({selectedGroups.length})
                  </Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">{t('chatAssignments.groupName')}</TableHead>
                          <TableHead className="font-semibold">{t('chatAssignments.groupDescription')}</TableHead>
                          <TableHead className="font-semibold text-right w-[100px]">{t('chatAssignments.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedGroups.map((groupId) => {
                          const group = studentGroups.find(g => g.id === groupId);
                          if (!group) return null;
                          return (
                            <TableRow key={groupId} className="hover:bg-muted/50">
                              <TableCell className="font-medium">
                                {group.name}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {group.description || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveGroup(groupId)}
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveAssignments} disabled={saving}>
              {saving ? t('chatAssignments.saving') : t('chatAssignments.saveAssignments')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Details Dialog */}
      <Dialog open={groupDetailsDialogOpen} onOpenChange={setGroupDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span>{selectedGroupDetails?.name || t('studentGroups.groupDetails')}</span>
            </DialogTitle>
          </DialogHeader>
          {loadingGroupDetails ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : selectedGroupDetails && (
            <div className="space-y-6 py-4">
              {/* Description */}
              {selectedGroupDetails.description && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">{t('common.description')}</h3>
                  <p className="text-sm text-muted-foreground">{selectedGroupDetails.description}</p>
                </div>
              )}

              {/* Instructors Section */}
              {selectedGroupDetails.instructors && selectedGroupDetails.instructors.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center space-x-2">
                    <UserCircle className="h-4 w-4" />
                    <span>{t('studentGroups.instructors')} ({selectedGroupDetails.instructors.length})</span>
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedGroupDetails.instructors.map((instructor, idx) => (
                      <div key={idx} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-white">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {instructor.first_name} {instructor.last_name}
                          </p>
                          {instructor.user?.email && (
                            <p className="text-sm text-muted-foreground">{instructor.user.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{t('studentGroups.noInstructorsInGroup')}</div>
              )}

              {/* Students Section */}
              {selectedGroupDetails.students && selectedGroupDetails.students.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>{t('studentGroups.students')} ({selectedGroupDetails.students.length})</span>
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedGroupDetails.students.map((student, idx) => (
                      <div key={idx} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-white">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {student.first_name} {student.last_name}
                          </p>
                          {student.student_id && (
                            <p className="text-sm text-muted-foreground">{t('students.studentId')}: {student.student_id}</p>
                          )}
                          {student.user?.email && (
                            <p className="text-sm text-muted-foreground">{student.user.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{t('studentGroups.noStudentsInGroup')}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
