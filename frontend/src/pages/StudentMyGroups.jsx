import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import Loading from '../components/Loading';
import { BookOpen, Users } from 'lucide-react';

export default function StudentMyGroups() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const studentProfile = user?.profile;

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="py-2">
        <h1 className="text-2xl font-bold">My Groups</h1>
        <p className="text-muted-foreground mt-1 text-sm">Groups you belong to</p>
      </div>

      {studentProfile?.groups && studentProfile.groups.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {studentProfile.groups.map((group) => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <CardTitle>{group.name}</CardTitle>
                </div>
                {group.description && (
                  <CardDescription>{group.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {group.instructors && group.instructors.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Instructors</span>
                    </div>
                    <div className="space-y-1">
                      {group.instructors.map((instructor, idx) => (
                        <div key={idx} className="text-sm">
                          {instructor.first_name} {instructor.last_name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {group.students && group.students.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Members: </span>
                    <span className="text-sm">{group.students.length} student{group.students.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You are not assigned to any groups yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

