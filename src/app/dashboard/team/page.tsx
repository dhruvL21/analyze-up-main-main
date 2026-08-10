'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useData } from '@/context/data-context';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Mail,
  CheckCircle2,
  Trash2,
  Lock,
  Building2,
  Key,
} from 'lucide-react';
import {
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceRole,
  logWorkspaceAction,
} from '@/lib/saas-engine';

export default function TeamPage() {
  const { toast } = useToast();
  const { user } = useUser();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('MANAGER');

  const [members, setMembers] = useState<WorkspaceMember[]>([
    {
      userId: user?.uid || 'user-1',
      email: user?.email || 'founder@business.com',
      name: user?.displayName || 'Business Founder',
      role: 'OWNER',
      joinedAt: '2026-01-15',
    },
    {
      userId: 'user-2',
      email: 'operations@business.com',
      name: 'Operations Manager',
      role: 'MANAGER',
      joinedAt: '2026-03-10',
    },
  ]);

  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([
    {
      id: 'inv-1',
      email: 'accountant@business.com',
      role: 'VIEWER',
      invitedBy: user?.email || 'founder@business.com',
      token: 'tok-9812',
      expiresAt: '2026-08-20',
      status: 'PENDING',
    },
  ]);

  const handleSendInvite = () => {
    if (!inviteEmail) return;

    const newInvite: WorkspaceInvitation = {
      id: `inv-${Date.now()}`,
      email: inviteEmail,
      role: inviteRole,
      invitedBy: user?.email || 'founder@business.com',
      token: `tok-${Math.floor(Math.random() * 10000)}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'PENDING',
    };

    setInvitations(prev => [...prev, newInvite]);
    logWorkspaceAction(user?.uid || 'sys', user?.displayName || 'Owner', 'OWNER', 'USER_INVITED', `Invited ${inviteEmail} as ${inviteRole}`, 'INVITATION');

    toast({
      title: '📧 Invitation Sent',
      description: `Secure invitation link sent to ${inviteEmail}.`,
    });

    setInviteEmail('');
    setInviteModalOpen(false);
  };

  const handleRevokeInvite = (id: string) => {
    setInvitations(prev => prev.filter(i => i.id !== id));
    toast({ title: 'Invitation Revoked', description: 'Pending invitation link invalidated.' });
  };

  const handleRoleChange = (userId: string, newRole: WorkspaceRole) => {
    setMembers(prev => prev.map(m => (m.userId === userId ? { ...m, role: newRole } : m)));
    toast({ title: 'Role Updated', description: `Member role updated to ${newRole}.` });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight md:text-2xl flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> Workspace Team & Role Permissions
            </h1>
            <Badge className="bg-primary/20 text-primary text-[10px] font-extrabold uppercase">
              Role Governance
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage active workspace members, assign role permissions, and send secure invitations.
          </p>
        </div>

        <Button
          onClick={() => setInviteModalOpen(true)}
          className="rounded-xl text-xs gap-1.5 bg-primary text-primary-foreground shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" /> Invite Team Member
        </Button>
      </div>

      {/* 1. Active Team Members Table */}
      <Card className="ios-glass rounded-2xl border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Active Workspace Roster ({members.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Users currently holding access to this business workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            {members.map(m => (
              <div
                key={m.userId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-xs">{m.name}</h4>
                    <span className="text-[10px] text-muted-foreground block">{m.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">Joined {m.joinedAt}</span>
                  {m.role === 'OWNER' ? (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                      OWNER
                    </Badge>
                  ) : (
                    <Select
                      defaultValue={m.role}
                      onValueChange={val => handleRoleChange(m.userId, val as WorkspaceRole)}
                    >
                      <SelectTrigger className="w-28 h-7 text-[10px] rounded-lg">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                        <SelectItem value="MANAGER">MANAGER</SelectItem>
                        <SelectItem value="STAFF">STAFF</SelectItem>
                        <SelectItem value="VIEWER">VIEWER</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Pending Invitations Table */}
      {invitations.length > 0 && (
        <Card className="ios-glass rounded-2xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-400" /> Pending Workspace Invitations ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {invitations.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/30"
                >
                  <div>
                    <span className="font-bold text-foreground block">{inv.email}</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Role: {inv.role} • Expires: {inv.expiresAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                      Pending
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-rose-400 hover:bg-rose-500/10"
                      onClick={() => handleRevokeInvite(inv.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Role Permissions Matrix Reference */}
      <Card className="ios-glass rounded-2xl border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" /> Role Permissions Governance Matrix
          </CardTitle>
          <CardDescription className="text-xs">
            System permissions enforced for each workspace role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <span className="font-bold text-amber-400 block text-xs">OWNER</span>
              <p className="text-[10px] text-muted-foreground">Full ownership, billing, workspace deletion, and team governance.</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-1">
              <span className="font-bold text-foreground block text-xs">ADMIN</span>
              <p className="text-[10px] text-muted-foreground">Manage operations, team members, integrations, and settings.</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-1">
              <span className="font-bold text-foreground block text-xs">MANAGER</span>
              <p className="text-[10px] text-muted-foreground">Manage inventory, products, purchase orders, and analytics.</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-1">
              <span className="font-bold text-foreground block text-xs">STAFF</span>
              <p className="text-[10px] text-muted-foreground">Operational data entry, order logging, and basic AI Copilot access.</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-1">
              <span className="font-bold text-foreground block text-xs">VIEWER</span>
              <p className="text-[10px] text-muted-foreground">Read-only dashboard, report viewing, and basic insights.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Member Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md pr-10">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Invite Team Member
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send a secure invitation link to join your workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email Address</Label>
              <Input
                placeholder="colleague@business.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assigned Workspace Role</Label>
              <Select defaultValue={inviteRole} onValueChange={val => setInviteRole(val as WorkspaceRole)}>
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">ADMIN (Full Management)</SelectItem>
                  <SelectItem value="MANAGER">MANAGER (Operations & Intelligence)</SelectItem>
                  <SelectItem value="STAFF">STAFF (Operations Entry)</SelectItem>
                  <SelectItem value="VIEWER">VIEWER (Read Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteModalOpen(false)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button onClick={handleSendInvite} className="rounded-xl text-xs bg-primary text-primary-foreground">
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
