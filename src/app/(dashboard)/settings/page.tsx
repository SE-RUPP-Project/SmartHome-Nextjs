'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, Mail, MessageSquare, Smartphone, User, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UserData {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  notification_preferences: NotificationPreferences;
}

export default function SettingsPage() {
  const { user, login } = useAuthStore();
  const { isSupported, permission, requestPermission, removeFCMToken, refreshToken } = usePushNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: true,
    sms: false,
  });

  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [userDetails, setUserDetails] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const isGuest = user?.role === 'guest';
  const canEdit = !isGuest;

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/api/users/me');
      if (response.data.success) {
        const userData: UserData = response.data.data;
        setUserDetails(userData);

        setProfile({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
        });

        if (userData.notification_preferences) {
          setPreferences(userData.notification_preferences);
        }

        if (user) {
          login(useAuthStore.getState().token || '', {
            id: userData._id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (isGuest) {
      toast.error('Guests cannot modify settings');
      return;
    }

    try {
      setSavingPreferences(true);
      const response = await api.put('/api/users/me/notifications', preferences);

      if (response.data.success) {
        toast.success('Notification preferences saved successfully');
      }
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast.error(error.response?.data?.message || 'Failed to save preferences');
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleSaveProfile = async () => {
    if (isGuest) {
      toast.error('Guests cannot modify settings');
      return;
    }

    try {
      setSavingProfile(true);
      const response = await api.put('/api/users/me', profile);

      if (response.data.success) {
        const updatedUser = response.data.data;

        if (user) {
          login(useAuthStore.getState().token || '', {
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
          });
        }

        setUserDetails(updatedUser);
        toast.success('Profile updated successfully');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (isGuest) {
      toast.error('Guests cannot change password');
      return;
    }

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await api.put('/api/auth/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.data.success) {
        toast.success('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  // Replace the handlePushToggle function in your SettingsPage component

  const handlePushToggle = async (checked: boolean) => {
    if (isGuest) {
      toast.error('Guests cannot modify notification settings');
      return;
    }

    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    if (checked) {
      // Enabling push notifications
      if (permission !== 'granted') {
        // Request permission for the first time
        const granted = await requestPermission();
        if (granted) {
          setPreferences({ ...preferences, push: true });
          toast.success('Push notifications enabled!');
        } else {
          toast.error('Permission denied. Please enable notifications in your browser settings.');
          setPreferences({ ...preferences, push: false });
        }
      } else {
        // Permission already granted, but toggle was off
        // Request new token (this refreshes the token)
        const success = await requestPermission(true);
        if (success) {
          setPreferences({ ...preferences, push: true });
          toast.success('Push notifications re-enabled!');
        } else {
          toast.error('Failed to enable push notifications. Please try again.');
          setPreferences({ ...preferences, push: false });
        }
      }
    } else {
      // Disabling push notifications
      await removeFCMToken();
      setPreferences({ ...preferences, push: false });
      toast.success('Push notifications disabled');
    }
  };

  // Also add this helper function to manually refresh token if needed
  const handleRefreshToken = async () => {
    if (isGuest) {
      toast.error('Guests cannot modify notification settings');
      return;
    }

    toast.loading('Refreshing notification token...');
    const success = await refreshToken();

    if (success) {
      toast.success('Notification token refreshed successfully!');
      setPreferences({ ...preferences, push: true });
    } else {
      toast.error('Failed to refresh token');
    }
  };

  const handleRequestPermission = async () => {
    if (isGuest) {
      toast.error('Guests cannot enable notifications');
      return;
    }

    const granted = await requestPermission();
    if (granted) {
      setPreferences({ ...preferences, push: true });
      toast.success('Push notifications enabled!');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          {isGuest ? 'View your account information (read-only)' : 'Manage your account and preferences'}
        </p>
      </div>

      {isGuest && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Guest accounts have view-only access. You cannot modify any settings. Contact an administrator for full access.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              {isGuest ? 'View your personal information' : 'Update your personal information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => canEdit && setProfile({ ...profile, name: e.target.value })}
                placeholder="Your name"
                disabled={!canEdit}
                readOnly={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => canEdit && setProfile({ ...profile, email: e.target.value })}
                placeholder="your.email@example.com"
                disabled={!canEdit}
                readOnly={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => canEdit && setProfile({ ...profile, phone: e.target.value })}
                placeholder="+1234567890"
                disabled={!canEdit}
                readOnly={!canEdit}
              />
              <p className="text-xs text-muted-foreground">
                Format: +[country code][number] (e.g., +1234567890)
              </p>
            </div>

            {canEdit && (
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Methods
            </CardTitle>
            <CardDescription>
              {isGuest ? 'View notification preferences' : 'Choose how you want to receive notifications'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Push Notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="push">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive real-time notifications on your device
                    </p>
                  </div>
                </div>
                <Switch
                  id="push"
                  checked={preferences.push && permission === 'granted'}
                  onCheckedChange={handlePushToggle}
                  disabled={!isSupported || !canEdit}
                />
              </div>

              {/* Status Messages */}
              {!isSupported && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Push notifications are not supported in this browser. Please use Chrome, Firefox, or Safari.
                  </AlertDescription>
                </Alert>
              )}

              {isSupported && permission === 'denied' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Notification permission was denied. To enable:
                    <ol className="list-decimal ml-4 mt-2 space-y-1">
                      <li>Click the lock/info icon in your browser's address bar</li>
                      <li>Find "Notifications" in the permissions list</li>
                      <li>Change it to "Allow"</li>
                      <li>Refresh this page and try again</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}

              {isSupported && permission === 'default' && !preferences.push && canEdit && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Enable push notifications to receive real-time alerts</span>
                    <Button
                      size="sm"
                      onClick={handleRequestPermission}
                      className="ml-2"
                    >
                      Enable Now
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {isSupported && permission === 'granted' && preferences.push && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ✓ Push notifications are enabled and working
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="email-notif">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts via email <span className='text-primary'>{profile?.email}</span>
                  </p>
                </div>
              </div>
              <Switch
                id="email-notif"
                checked={preferences.email}
                onCheckedChange={(checked) =>
                  canEdit && setPreferences({ ...preferences, email: checked })
                }
                disabled={!canEdit}
              />
            </div>

            <Separator />

            {canEdit && (
              <Button
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                className="w-full"
              >
                {savingPreferences ? 'Saving...' : 'Save Notification Preferences'}
              </Button>
            )}
          </CardContent>
        </Card>

        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="w-full"
                variant="secondary"
              >
                {changingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        )}

        {userDetails && (
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">User ID</Label>
                <p className="text-sm font-mono">{userDetails._id}</p>
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Role</Label>
                <p className="text-sm capitalize">{userDetails.role}</p>
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Account Status</Label>
                <p className="text-sm">
                  {userDetails.is_active ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-red-600 font-medium">Inactive</span>
                  )}
                </p>
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Member Since</Label>
                <p className="text-sm">
                  {new Date(userDetails.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              {userDetails.last_login && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">Last Login</Label>
                    <p className="text-sm">
                      {new Date(userDetails.last_login).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}