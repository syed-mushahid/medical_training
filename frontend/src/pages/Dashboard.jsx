import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Users, GraduationCap, BookOpen, MessageSquare, TrendingUp, BarChart3, Activity, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import Loading from '../components/Loading';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'instructor') {
      fetchInstructorStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchInstructorStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/instructor/dashboard/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch instructor stats:', error);
      toast({
        title: t('toast.error'),
        description: error.response?.data?.error || t('dashboard.failedToFetchStats'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && user?.role === 'instructor') {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('dashboard.welcome', { email: user?.email })}
        </p>
      </div>

      {/* Instructor Dashboard Analytics */}
      {user?.role === 'instructor' && stats && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm border-0 bg-white hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.totalGroups')}</CardTitle>
                <BookOpen className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.total_groups}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dashboard.groupsManaged')}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0 bg-white hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.totalStudents')}</CardTitle>
                <GraduationCap className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.total_students}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dashboard.studentsInGroups')}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0 bg-white hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.assignedChats')}</CardTitle>
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{stats.total_assigned_chats}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dashboard.chatAssistantsAssigned')}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0 bg-white hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.groupsCreated')}</CardTitle>
                <Activity className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.groups_created}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dashboard.totalGroupsCreated')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics Section */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Performance Metrics */}
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span>{t('dashboard.performanceMetrics')}</span>
                </CardTitle>
                <CardDescription>
                  {t('dashboard.keyPerformanceIndicators')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">{t('dashboard.avgStudentsPerGroup')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('dashboard.averageCalculation')}
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.avg_students_per_group}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">{t('dashboard.recentActivity')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('dashboard.groupsCreatedLast30Days')}
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.recent_groups}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Overview */}
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <span>{t('dashboard.summaryOverview')}</span>
                </CardTitle>
                <CardDescription>
                  {t('dashboard.overviewDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{t('dashboard.totalGroups')}</span>
                  </div>
                  <Badge variant="secondary" className="text-base font-semibold">
                    {stats.total_groups}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{t('dashboard.totalStudents')}</span>
                  </div>
                  <Badge variant="secondary" className="text-base font-semibold">
                    {stats.total_students}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">{t('dashboard.assignedChats')}</span>
                  </div>
                  <Badge variant="secondary" className="text-base font-semibold">
                    {stats.total_assigned_chats}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">{t('dashboard.groupsCreated')}</span>
                  </div>
                  <Badge variant="secondary" className="text-base font-semibold">
                    {stats.groups_created}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Admin/Default Dashboard */}
      {user?.role !== 'instructor' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {user?.role === 'admin' && (
            <Card className="shadow-sm border-0 bg-white hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.instructors')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{t('dashboard.manage')}</div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.instructorsDesc')}
                </p>
              </CardContent>
            </Card>
          )}
          {(user?.role === 'admin' || user?.role === 'instructor') && (
            <>
              <Card className="shadow-sm border-0 bg-white hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.students')}</CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{t('dashboard.manage')}</div>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.studentsDesc')}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-0 bg-white hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.studentGroups')}</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{t('dashboard.manage')}</div>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.studentGroupsDesc')}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
