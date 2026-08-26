import React, { useEffect, useState } from 'react';
import { StaffLogin } from './StaffLogin';
import { StaffPanel } from './StaffPanel';
import { staffApi } from './api';

export function StaffApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [staffUsername, setStaffUsername] = useState('');

  useEffect(() => {
    const restoreSession = async () => {
      if (!staffApi.getStoredSessionToken()) {
        setAuthChecked(true);
        return;
      }
      try {
        const me = await staffApi.getMe();
        setStaffUsername(me.username);
        setAuthenticated(true);
      } catch {
        setAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };
    void restoreSession();

    const handleExpired = () => {
      setAuthenticated(false);
      setStaffUsername('');
    };
    window.addEventListener('arctic-staff-expired', handleExpired);
    return () => window.removeEventListener('arctic-staff-expired', handleExpired);
  }, []);

  if (!authChecked) {
    return <div className="flex min-h-screen items-center justify-center bg-frost-950 text-sm text-frost-500">Checking staff session...</div>;
  }

  if (!authenticated) {
    return <StaffLogin onAuthenticated={(username) => { setStaffUsername(username); setAuthenticated(true); }} />;
  }

  return (
    <StaffPanel
      staffUsername={staffUsername}
      onLogout={async () => {
        try {
          await staffApi.logout();
        } finally {
          setAuthenticated(false);
          setStaffUsername('');
        }
      }}
    />
  );
}
