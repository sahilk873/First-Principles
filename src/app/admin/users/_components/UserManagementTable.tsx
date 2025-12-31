'use client';

import { useState, useTransition } from 'react';
import { Profile, Organization, UserRole } from '@/types/database';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils/date';
import { updateUserRole, toggleExpertCertification, updateUserOrganization, quickCreateUser } from '@/lib/actions/admin';

interface ProfileWithOrg extends Profile {
  organization?: Organization;
}

interface UserManagementTableProps {
  users: ProfileWithOrg[];
  organizations: Organization[];
  currentUserRole: UserRole;
  currentUserOrgId: string;
}

export function UserManagementTable({
  users,
  organizations,
  currentUserRole,
  currentUserOrgId,
}: UserManagementTableProps) {
  const [isPending, startTransition] = useTransition();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('CLINICIAN');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [provisionedCredentials, setProvisionedCredentials] = useState<{ email: string } | null>(null);

  const isSysAdmin = currentUserRole === 'SYS_ADMIN';

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result.success) {
        setSuccess('Role updated successfully');
        setEditingUser(null);
      } else {
        setError(result.error || 'Failed to update role');
      }
    });
  };

  const handleCertificationToggle = async (userId: string) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await toggleExpertCertification(userId);
      if (result.success) {
        setSuccess('Certification status updated');
      } else {
        setError(result.error || 'Failed to update certification');
      }
    });
  };

  const handleOrgChange = async (userId: string, newOrgId: string) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateUserOrganization(userId, newOrgId);
      if (result.success) {
        setSuccess('Organization updated successfully');
        setEditingUser(null);
      } else {
        setError(result.error || 'Failed to update organization');
      }
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SYS_ADMIN':
        return 'purple';
      case 'ORG_ADMIN':
        return 'info';
      case 'EXPERT_REVIEWER':
        return 'success';
      case 'CLINICIAN':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const roleOptions = isSysAdmin
    ? [
        { value: 'CLINICIAN', label: 'Clinician' },
        { value: 'EXPERT_REVIEWER', label: 'Expert Reviewer' },
        { value: 'ORG_ADMIN', label: 'Org Admin' },
        { value: 'SYS_ADMIN', label: 'System Admin' },
      ]
    : [
        { value: 'CLINICIAN', label: 'Clinician' },
        { value: 'EXPERT_REVIEWER', label: 'Expert Reviewer' },
      ];

  const orgOptions = organizations.map((org) => ({
    value: org.id,
    label: org.name,
  }));

  const handleQuickCreate = async () => {
    setError(null);
    setSuccess(null);
    setProvisionedCredentials(null);
    startTransition(async () => {
      const result = await quickCreateUser(newUserName, newUserRole, newUserEmail);
      if (result.success && result.email) {
        setProvisionedCredentials({ email: result.email });
        setSuccess('Invitation email sent to the new user.');
        setNewUserName('');
        setNewUserEmail('');
      } else {
        setError(result.error || 'Failed to create user');
      }
    });
  };

  return (
    <div>
      {/* Feedback Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <Card className="mb-6">
        <div className="p-4 space-y-3 md:space-y-0 md:flex md:items-end md:gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <Input
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Dr. Jane Doe"
              disabled={isPending}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <Input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={isPending}
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <Select
              options={roleOptions}
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              disabled={isPending}
              className="w-full"
            />
          </div>
          <Button
            onClick={handleQuickCreate}
            disabled={!newUserName.trim() || !newUserEmail.trim() || isPending}
            isLoading={isPending}
          >
            Send Invite
          </Button>
        </div>
        {provisionedCredentials && (
          <div className="px-4 pb-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">
              Invite sent to <code className="bg-slate-100 px-2 py-0.5 rounded">{provisionedCredentials.email}</code>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              They will receive an email with instructions to set their password.
            </p>
          </div>
        )}
      </Card>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-slate-100">
          <CardHeader>
            {isSysAdmin ? 'All Users' : 'Organization Users'}
          </CardHeader>
        </div>
        <Table>
          <TableHeader>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            {isSysAdmin && <TableHead>Organization</TableHead>}
            <TableHead>Role</TableHead>
            <TableHead>Certified</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableEmptyState
                title="No users found"
                description="There are no users in this view"
                icon={
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                }
              />
            ) : (
              users.map((user) => {
                const isEditing = editingUser === user.id;
                const canEdit = isSysAdmin || (user.org_id === currentUserOrgId && user.role !== 'SYS_ADMIN');

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{user.name}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-500">{user.email}</span>
                    </TableCell>
                    {isSysAdmin && (
                      <TableCell>
                        {isEditing ? (
                          <Select
                            options={orgOptions}
                            value={user.org_id}
                            onChange={(e) => handleOrgChange(user.id, e.target.value)}
                            disabled={isPending}
                            className="w-40"
                          />
                        ) : (
                          <span className="text-slate-600">{user.organization?.name || 'Unknown'}</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {isEditing ? (
                        <Select
                          options={roleOptions}
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          disabled={isPending}
                          className="w-40"
                        />
                      ) : (
                        <Badge variant={getRoleBadgeVariant(user.role) as 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'}>
                          {formatRole(user.role)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleCertificationToggle(user.id)}
                        disabled={isPending || !canEdit}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          user.is_expert_certified
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={user.is_expert_certified ? 'Certified (click to revoke)' : 'Not certified (click to certify)'}
                      >
                        {user.is_expert_certified ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <Button
                          variant={isEditing ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setEditingUser(isEditing ? null : user.id)}
                          disabled={isPending}
                        >
                          {isEditing ? 'Done' : 'Edit'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
