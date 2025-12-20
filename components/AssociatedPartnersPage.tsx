import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Edit, Search, Building2, Globe, Mail, Upload, Trash2, FileText, User, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { serverUrl, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase';
import type { AssociatedPartner } from '../types/proposal';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/primitives';

export function AssociatedPartnersPage() {
    const [partners, setPartners] = useState<AssociatedPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [partnerToDelete, setPartnerToDelete] = useState<AssociatedPartner | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partial<AssociatedPartner> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${serverUrl}/associated-partners`, {
                headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load associated partners');
            }

            const data = await response.json();
            setPartners(data.partners || []);
        } catch (error: any) {
            console.error('Load error:', error);
            toast.error(error.message || 'Failed to load associated partners');
        } finally {
            setLoading(false);
        }
    };

    const handleSavePartner = async () => {
        if (!editingPartner?.name) {
            toast.error('Partner name is required');
            return;
        }

        setIsSaving(true);
        try {
            const method = editingPartner.id ? 'PUT' : 'POST';
            const url = editingPartner.id
                ? `${serverUrl}/associated-partners/${editingPartner.id}`
                : `${serverUrl}/associated-partners`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editingPartner),
            });

            if (!response.ok) {
                throw new Error('Failed to save partner');
            }

            toast.success(`Partner ${editingPartner.id ? 'updated' : 'created'} successfully`);
            setEditDialogOpen(false);
            loadPartners();
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error(error.message || 'Failed to save partner');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'templateUrl') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading(`Uploading ${field === 'logoUrl' ? 'logo' : 'template'}...`);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const bucket = field === 'logoUrl' ? 'partner-assets' : 'proposal-annexes';
            const filePath = `associated-partners/${fileName}`;

            const { data, error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            setEditingPartner(prev => ({
                ...prev,
                [field]: publicUrl,
                ...(field === 'templateUrl' ? { templatePath: filePath } : {})
            }));

            toast.success('File uploaded successfully', { id: toastId });
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`Upload failed: ${error.message}`, { id: toastId });
        }
    };

    const handleDeleteConfirm = async () => {
        if (!partnerToDelete) return;

        try {
            const response = await fetch(`${serverUrl}/associated-partners/${partnerToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete partner');
            }

            setPartners(partners.filter(p => p.id !== partnerToDelete.id));
            toast.success(`${partnerToDelete.name} deleted`);
        } catch (error: any) {
            console.error('Delete error:', error);
            toast.error(error.message || 'Failed to delete partner');
        } finally {
            setPartnerToDelete(null);
            setDeleteDialogOpen(false);
        }
    };

    const filteredPartners = partners.filter(partner =>
        partner.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        partner.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                        <Building2 className="h-6 w-6 text-primary" />
                        Associated Partners
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage partners for Letters of Support and collaboration
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setEditingPartner({ name: '', role: 'Associated Partner' });
                        setEditDialogOpen(true);
                    }}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Associated Partner
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or contact person..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {filteredPartners.length === 0 ? (
                <div className="text-center py-12">
                    <Building2 className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                    <p className="text-muted-foreground">
                        {searchQuery ? 'No partners match your search' : 'No associated partners added yet'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPartners.map((partner) => (
                        <Card key={partner.id} className="hover:border-primary/50 transition-colors group">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">{partner.name}</CardTitle>
                                        <CardDescription className="text-xs mt-1">{partner.role}</CardDescription>
                                    </div>
                                    {partner.logoUrl && (
                                        <img
                                            src={partner.logoUrl}
                                            alt={partner.name}
                                            className="w-12 h-12 object-contain ml-2 bg-white/5 rounded-md p-1"
                                        />
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2">
                                    {partner.contactPerson && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            <span>{partner.contactPerson}</span>
                                        </div>
                                    )}
                                    {partner.email && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Mail className="h-3 w-3" />
                                            <span>{partner.email}</span>
                                        </div>
                                    )}
                                    {partner.phone && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Phone className="h-3 w-3" />
                                            <span>{partner.phone}</span>
                                        </div>
                                    )}
                                    {partner.templateUrl && (
                                        <div className="flex items-center gap-2 text-xs text-green-400">
                                            <FileText className="h-3 w-3" />
                                            <span>Template Uploaded</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        onClick={() => {
                                            setEditingPartner(partner);
                                            setEditDialogOpen(true);
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                    >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setPartnerToDelete(partner);
                                            setDeleteDialogOpen(true);
                                        }}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-white border border-red-500/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] bg-[#1e1e1e] text-white border-white/10">
                    <DialogHeader>
                        <DialogTitle>{editingPartner?.id ? 'Edit' : 'Add'} Associated Partner</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Organization Name</Label>
                            <Input
                                id="name"
                                value={editingPartner?.name || ''}
                                onChange={(e) => setEditingPartner(prev => ({ ...prev!, name: e.target.value }))}
                                placeholder="e.g. University of Example"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="contact">Contact Person</Label>
                                <Input
                                    id="contact"
                                    value={editingPartner?.contactPerson || ''}
                                    onChange={(e) => setEditingPartner(prev => ({ ...prev!, contactPerson: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="role">Role/Position</Label>
                                <Input
                                    id="role"
                                    value={editingPartner?.role || ''}
                                    onChange={(e) => setEditingPartner(prev => ({ ...prev!, role: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={editingPartner?.email || ''}
                                    onChange={(e) => setEditingPartner(prev => ({ ...prev!, email: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={editingPartner?.phone || ''}
                                    onChange={(e) => setEditingPartner(prev => ({ ...prev!, phone: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={editingPartner?.address || ''}
                                onChange={(e) => setEditingPartner(prev => ({ ...prev!, address: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Logo</Label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'logoUrl')}
                                    className="cursor-pointer"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Letter Template (DOCX)</Label>
                                <Input
                                    type="file"
                                    accept=".docx"
                                    onChange={(e) => handleFileUpload(e, 'templateUrl')}
                                    className="cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSavePartner} disabled={isSaving}>
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Partner
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
                title="Delete Associated Partner"
                description={`Are you sure you want to delete ${partnerToDelete?.name}?`}
            />
        </div>
    );
}
