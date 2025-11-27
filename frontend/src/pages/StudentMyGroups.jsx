import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import Loading from '../components/Loading';
import { BookOpen, Users, Eye, GraduationCap, UserCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

export default function StudentMyGroups() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const { t } = useTranslation();

  const studentProfile = user?.profile;

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleViewDetails = (group) => {
    setSelectedGroup(group);
    setDetailsDialogOpen(true);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="py-2">
        <h1 className="text-2xl font-bold">{t('layout.myGroups')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('studentGroups.groupsYouBelongTo')}</p>
      </div>

      {studentProfile?.groups && studentProfile.groups.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {studentProfile.groups.map((group) => (
            <Card key={group.id} className="hover:shadow-md transition-all shadow-sm border-0 bg-white">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/10">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1 truncate">{group.name}</CardTitle>
                      {group.description && (
                        <CardDescription className="line-clamp-2">{group.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {group.students && group.students.length > 0 && (
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <GraduationCap className="h-3 w-3" />
                        <span>{group.students.length} {t('studentGroups.students')}</span>
                      </Badge>
                    )}
                    {group.instructors && group.instructors.length > 0 && (
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <UserCircle className="h-3 w-3" />
                        <span>{group.instructors.length} {t('studentGroups.instructors')}</span>
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleViewDetails(group)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {t('studentGroups.viewDetails')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-primary opacity-60" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('studentGroups.notAssignedToGroups')}</h3>
            <p className="text-muted-foreground">{t('studentGroups.noGroupsAssignedMessage')}</p>
          </CardContent>
        </Card>
      )}

      {/* Group Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span>{selectedGroup?.name || t('studentGroups.groupDetails')}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-6">
              {selectedGroup.description && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">{t('common.description')}</h3>
                  <p className="text-sm text-muted-foreground">{selectedGroup.description}</p>
                </div>
              )}

              {selectedGroup.instructors && selectedGroup.instructors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center space-x-2">
                    <UserCircle className="h-4 w-4" />
                    <span>{t('studentGroups.instructors')} ({selectedGroup.instructors.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {selectedGroup.instructors.map((instructor, idx) => (
                      <div key={idx} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {instructor.first_name} {instructor.last_name}
                          </p>
                          {instructor.email && (
                            <p className="text-sm text-muted-foreground">{instructor.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedGroup.students && selectedGroup.students.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>{t('studentGroups.students')} ({selectedGroup.students.length})</span>
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedGroup.students.map((student, idx) => {
                      const isCurrentStudent = user?.profile?.id === student.id;
                      return (
                        <div 
                          key={idx} 
                          className={cn(
                            "flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors",
                            isCurrentStudent && "bg-primary/5 border-primary/20"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            isCurrentStudent ? "bg-primary/20" : "bg-primary/10"
                          )}>
                            <GraduationCap className={cn(
                              "h-5 w-5",
                              isCurrentStudent ? "text-primary" : "text-primary"
                            )} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium">
                                {student.first_name} {student.last_name}
                              </p>
                              {isCurrentStudent && (
                                <Badge variant="secondary" className="text-xs">
                                  {t('studentGroups.you')}
                                </Badge>
                              )}
                            </div>
                            {student.student_id && (
                              <p className="text-sm text-muted-foreground">{t('students.studentId')}: {student.student_id}</p>
                            )}
                            {student.user?.email && (
                              <p className="text-sm text-muted-foreground">{student.user.email}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

