import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import api from '../lib/api';
import { BookOpen, User } from 'lucide-react';
import Loading from '../components/Loading';

export default function StudentDashboard() {
  const { user, fetchUser } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Loading />;
  }

  const studentProfile = user?.profile;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome, {studentProfile?.first_name} {studentProfile?.last_name}!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            <CardDescription>Your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Full Name</p>
              <p className="text-lg">
                {studentProfile?.first_name} {studentProfile?.last_name}
              </p>
            </div>
            {studentProfile?.phone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-lg">{studentProfile.phone}</p>
              </div>
            )}
            {studentProfile?.date_of_birth && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                <p className="text-lg">{studentProfile.date_of_birth}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <CardTitle>My Groups</CardTitle>
            </div>
            <CardDescription>Groups you belong to</CardDescription>
          </CardHeader>
          <CardContent>
            {studentProfile?.groups && studentProfile.groups.length > 0 ? (
              <div className="space-y-3">
                {studentProfile.groups.map((group) => (
                  <div
                    key={group.id}
                    className="p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <h3 className="font-semibold">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.description}
                      </p>
                    )}
                    {group.instructors && group.instructors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">
                          Instructors: {group.instructors.map(i => `${i.first_name} ${i.last_name}`).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">You are not assigned to any groups yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

