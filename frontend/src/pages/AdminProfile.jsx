import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { useToast } from '../components/ui/use-toast.jsx';
import Loading from '../components/Loading';
import { UserCircle, Mail, Edit, Lock, Shield } from 'lucide-react';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';

export default function AdminProfile() {
  const { user, fetchUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    email: ''
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
    if (user) {
      setFormData({
        email: user.email || ''
      });
    }
  }, [user]);

  const handleOpenEdit = () => {
    if (user) {
      setFormData({
        email: user.email || ''
      });
    }
    setEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      // Validate email format
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        toast({
          title: 'Error',
          description: 'Please enter a valid email address',
          variant: 'destructive',
        });
        return;
      }

      const response = await api.put('/admin/profile', formData);
      
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

      const response = await api.post('/admin/change-password', {
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

  return (
    <div className="space-y-6">
      <div className="py-2 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('profile.subtitleAdmin')}</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleOpenEdit} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            {t('profile.editProfile')}
          </Button>
          <Button onClick={() => setPasswordDialogOpen(true)} variant="outline">
            <Lock className="h-4 w-4 mr-2" />
            {t('profile.changePassword')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
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
              <div className="flex items-center space-x-2 mb-1">
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Role</p>
              </div>
              <p className="text-lg capitalize">{user?.role}</p>
            </div>
            {user?.created_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Account Created</p>
                <p className="text-lg">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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

