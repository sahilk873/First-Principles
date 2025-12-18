'use client';

import { useState, useTransition } from 'react';
import { Organization, OrganizationType } from '@/types/database';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils/date';
import { createOrganization, updateOrganization } from '@/lib/actions/admin';

interface OrganizationWithStats extends Organization {
  userCount: number;
  caseCount: number;
}

interface OrganizationManagementTableProps {
  organizations: OrganizationWithStats[];
}

const orgTypeOptions = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'private_practice', label: 'Private Practice' },
  { value: 'aco', label: 'ACO' },
  { value: 'other', label: 'Other' },
];

export function OrganizationManagementTable({ organizations }: OrganizationManagementTableProps) {
  const [isPending, startTransition] = useTransition();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for creating new org
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgType, setNewOrgType] = useState<OrganizationType>('hospital');
  const [newOrgRegion, setNewOrgRegion] = useState('');

  // Form state for editing org
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<OrganizationType>('hospital');
  const [editRegion, setEditRegion] = useState('');

  const handleCreate = async () => {
    if (!newOrgName.trim()) {
      setError('Organization name is required');
      return;
    }

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await createOrganization(newOrgName.trim(), newOrgType, newOrgRegion.trim());
      if (result.success) {
        setSuccess('Organization created successfully');
        setShowCreateForm(false);
        setNewOrgName('');
        setNewOrgType('hospital');
        setNewOrgRegion('');
      } else {
        setError(result.error || 'Failed to create organization');
      }
    });
  };

  const handleStartEdit = (org: Organization) => {
    setEditingOrg(org.id);
    setEditName(org.name);
    setEditType(org.type);
    setEditRegion(org.region || '');
  };

  const handleUpdate = async (orgId: string) => {
    if (!editName.trim()) {
      setError('Organization name is required');
      return;
    }

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateOrganization(orgId, editName.trim(), editType, editRegion.trim());
      if (result.success) {
        setSuccess('Organization updated successfully');
        setEditingOrg(null);
      } else {
        setError(result.error || 'Failed to update organization');
      }
    });
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'hospital':
        return 'info';
      case 'private_practice':
        return 'success';
      case 'aco':
        return 'purple';
      default:
        return 'default';
    }
  };

  const formatType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
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

      {/* Create Organization Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>Create New Organization</CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Organization Name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Enter organization name"
            />
            <Select
              label="Type"
              options={orgTypeOptions}
              value={newOrgType}
              onChange={(e) => setNewOrgType(e.target.value as OrganizationType)}
            />
            <Input
              label="Region"
              value={newOrgRegion}
              onChange={(e) => setNewOrgRegion(e.target.value)}
              placeholder="e.g., Northeast"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Organization'}
            </Button>
            <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Organizations Table */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <CardHeader className="!mb-0">Organizations</CardHeader>
          {!showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Organization
            </Button>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Cases</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableHeader>
          <TableBody>
            {organizations.length === 0 ? (
              <TableEmptyState
                title="No organizations"
                description="Create your first organization to get started"
                icon={
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                }
              />
            ) : (
              organizations.map((org) => {
                const isEditing = editingOrg === org.id;

                return (
                  <TableRow key={org.id}>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-48"
                        />
                      ) : (
                        <div className="font-medium text-slate-900">{org.name}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          options={orgTypeOptions}
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as OrganizationType)}
                          className="w-36"
                        />
                      ) : (
                        <Badge variant={getTypeBadgeVariant(org.type) as 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'}>
                          {formatType(org.type)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editRegion}
                          onChange={(e) => setEditRegion(e.target.value)}
                          placeholder="Region"
                          className="w-32"
                        />
                      ) : (
                        <span className="text-slate-600">{org.region || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{org.userCount}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{org.caseCount}</span>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(org.created_at)}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(org.id)}
                            disabled={isPending}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingOrg(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(org)}
                        >
                          Edit
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

