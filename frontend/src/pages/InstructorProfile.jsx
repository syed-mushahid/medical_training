import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { useToast } from '../components/ui/use-toast.jsx';
import Loading from '../components/Loading';
import { UserCircle, Mail, Phone, Edit, Lock, Key } from 'lucide-react';
import api from '../lib/api';

export default function InstructorProfile() {
  const { user, fetchUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    ragflow_api_key: ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchUser().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.profile) {
      const profile = user.profile;
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        email: user.email || '',
        ragflow_api_key: profile.ragflow_api_key || ''
      });
    }
  }, [user]);

  const handleOpenEdit = () => {
    if (user?.profile) {
      const profile = user.profile;
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        email: user.email || '',
        ragflow_api_key: profile.ragflow_api_key || ''
      });
    }
    setEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      // Validate required fields
      if (!formData.first_name || !formData.last_name) {
        toast({
          title: 'Error',
          description: 'First name and last name are required',
          variant: 'destructive',
        });
        return;
      }

      // Validate email format
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        toast({
          title: 'Error',
          description: 'Please enter a valid email address',
          variant: 'destructive',
        });
        return;
      }

      const response = await api.put('/instructor/profile', formData);
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });
        setEditDialogOpen(false);
        await fetchUser(); // Refresh user data
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setChangingPassword(true);
      
      // Validate passwords
      if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
        toast({
          title: 'Error',
          description: 'All password fields are required',
          variant: 'destructive',
        });
        return;
      }

      if (passwordData.new_password !== passwordData.confirm_password) {
        toast({
          title: 'Error',
          description: 'New password and confirm password do not match',
          variant: 'destructive',
        });
        return;
      }

      if (passwordData.new_password.length < 6) {
        toast({
          title: 'Error',
          description: 'New password must be at least 6 characters long',
          variant: 'destructive',
        });
        return;
      }

      const response = await api.post('/instructor/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Password changed successfully',
        });
        setPasswordDialogOpen(false);
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  const instructorProfile = user?.profile;

  return (
    <div className="space-y-6">
      <div className="py-2 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Profile Information</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your personal details and account information</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleOpenEdit} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
          <Button onClick={() => setPasswordDialogOpen(true)} variant="outline">
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <UserCircle className="h-5 w-5 text-primary" />
              <CardTitle>Personal Information</CardTitle>
            </div>
            <CardDescription>Your basic profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Full Name</p>
              <p className="text-lg">
                {instructorProfile?.first_name} {instructorProfile?.last_name}
              </p>
            </div>
            {instructorProfile?.phone && (
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                </div>
                <p className="text-lg">{instructorProfile.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Account Information</CardTitle>
            </div>
            <CardDescription>Your login credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Email</p>
              </div>
              <p className="text-lg">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Role</p>
              <p className="text-lg capitalize">{user?.role}</p>
            </div>
            {instructorProfile?.created_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Account Created</p>
                <p className="text-lg">
                  {new Date(instructorProfile.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>RAGFlow API Key</CardTitle>
            </div>
            <CardDescription>Your RAGFlow API key for dataset operations</CardDescription>
          </CardHeader>
          <CardContent>
            {instructorProfile?.ragflow_api_key ? (
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                  {instructorProfile.ragflow_api_key.substring(0, 20)}...
                </code>
              </div>
            ) : (
              <p className="text-muted-foreground">No API key configured</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="First Name"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Last Name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone Number"
              />
            </div>
            <div>
              <Label htmlFor="ragflow_api_key">RAGFlow API Key</Label>
              <Input
                id="ragflow_api_key"
                type="password"
                value={formData.ragflow_api_key}
                onChange={(e) => setFormData({ ...formData, ragflow_api_key: e.target.value })}
                placeholder="Enter new RAGFlow API Key (leave empty to keep current)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to keep current API key unchanged, or enter a new one to update it
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="current_password">Current Password *</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label htmlFor="new_password">New Password *</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                placeholder="Enter new password (min. 6 characters)"
              />
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirm New Password *</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setPasswordDialogOpen(false);
              setPasswordData({
                current_password: '',
                new_password: '',
                confirm_password: ''
              });
            }}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

