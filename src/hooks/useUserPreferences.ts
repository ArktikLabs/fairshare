import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface NotificationSetting {
  id: string;
  userId: string;
  templateKey: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotificationTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  defaultEmail: boolean;
  defaultPush: boolean;
  required: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  currency: string;
  timezone: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  notificationTemplates?: NotificationTemplate[];
  notificationSettings?: NotificationSetting[];
}

const defaultPreferences: Partial<UserPreferences> = {
  theme: 'light',
  currency: 'USD',
  timezone: 'UTC',
  language: 'en',
  notificationTemplates: [],
  notificationSettings: [],
};

export function useUserPreferences() {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      loadPreferences();
    }
  }, [session?.user?.id]);

  const loadPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      } else {
        throw new Error('Failed to load preferences');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
      console.error('Error loading preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = async (theme: 'light' | 'dark' | 'system') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        return true;
      } else {
        throw new Error('Failed to update theme');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update theme');
      console.error('Error updating theme:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSetting = async (templateKey: string, emailEnabled?: boolean, pushEnabled?: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationSettings: [{
            templateKey,
            ...(emailEnabled !== undefined && { emailEnabled }),
            ...(pushEnabled !== undefined && { pushEnabled }),
          }]
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        return true;
      } else {
        throw new Error('Failed to update notification setting');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification setting');
      console.error('Error updating notification setting:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateCurrency = async (currency: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currency }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        return true;
      } else {
        throw new Error('Failed to update currency');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update currency');
      console.error('Error updating currency:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateTimezone = async (timezone: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timezone }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        return true;
      } else {
        throw new Error('Failed to update timezone');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update timezone');
      console.error('Error updating timezone:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateLanguage = async (language: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        return true;
      } else {
        throw new Error('Failed to update language');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update language');
      console.error('Error updating language:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getNotificationSetting = (templateKey: string): { email: boolean; push: boolean } => {
    if (!preferences?.notificationSettings) {
      return { email: true, push: true };
    }
    
    const setting = preferences.notificationSettings.find(s => s.templateKey === templateKey);
    if (setting) {
      return { email: setting.emailEnabled, push: setting.pushEnabled };
    }
    
    // Fallback to template defaults
    const template = preferences.notificationTemplates?.find(t => t.key === templateKey);
    return {
      email: template?.defaultEmail ?? true,
      push: template?.defaultPush ?? true,
    };
  };

  const getNotificationsByCategory = () => {
    if (!preferences?.notificationTemplates) return {};
    
    return preferences.notificationTemplates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      
      const setting = getNotificationSetting(template.key);
      acc[template.category].push({
        ...template,
        emailEnabled: setting.email,
        pushEnabled: setting.push,
      });
      
      return acc;
    }, {} as Record<string, any[]>);
  };

  // Theme-specific utilities
  const isDarkMode = () => {
    if (!preferences) return false;
    if (preferences.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return preferences.theme === 'dark';
  };

  const getThemeClass = () => {
    if (!preferences) return 'light';
    if (preferences.theme === 'system') {
      return 'theme-system';
    }
    return preferences.theme === 'dark' ? 'dark' : 'light';
  };

  return {
    preferences: preferences || defaultPreferences,
    loading,
    error,
    loadPreferences,
    updateTheme,
    updateCurrency,
    updateTimezone,
    updateLanguage,
    updateNotificationSetting,
    getNotificationSetting,
    getNotificationsByCategory,
    isDarkMode,
    getThemeClass,
  };
}

export type { UserPreferences, NotificationSetting, NotificationTemplate };
