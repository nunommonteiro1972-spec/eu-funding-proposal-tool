import React, { useState } from 'react';
import { Upload, FileText, X, Download, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/primitives';
import { Select } from '@/components/ui/primitives';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase';
import type { Annex } from '../types/proposal';

interface AnnexesManagerProps {
    proposalId: string;
    annexes: Annex[];
    partners: Array<{ name: string; id?: string }>;
    onUpdate: (annexes: Annex[]) => void;
}

const ANNEX_TYPES = [
    { value: 'declaration', label: 'Declaration on Honour' },
    { value: 'accession_form', label: 'Accession Form' },
    { value: 'letter_of_intent', label: 'Letter of Intent' },
    { value: 'cv', label: 'CV' },
] as const;

export function AnnexesManager({ proposalId, annexes = [], partners, onUpdate }: AnnexesManagerProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [newAnnex, setNewAnnex] = useState<{
        type: Annex['type'];
        title: string;
        partnerId?: string;
    }>({
        type: 'declaration',
        title: '',
    });

    const handleFileUpload = async (file: File) => {
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${proposalId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `annexes/${fileName}`;

            const { data, error: uploadError } = await supabase.storage
                .from('proposal-annexes')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('proposal-annexes')
                .getPublicUrl(filePath);

            const annex: Annex = {
                id: `annex-${Date.now()}`,
                type: newAnnex.type,
                title: newAnnex.title || file.name,
                fileName: file.name,
                fileUrl: publicUrl,
                filePath: filePath,
                uploadedAt: new Date().toISOString(),
                partnerId: newAnnex.partnerId,
                partnerName: newAnnex.partnerId
                    ? partners.find(p => p.id === newAnnex.partnerId)?.name
                    : undefined,
            };

            onUpdate([...annexes, annex]);
            toast.success(`${ANNEX_TYPES.find(t => t.value === newAnnex.type)?.label} uploaded successfully`);

            // Reset form
            setNewAnnex({ type: 'declaration', title: '' });
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`Failed to upload file: ${error.message || 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = async (annexId: string) => {
        const annexToRemove = annexes.find(a => a.id === annexId);
        if (annexToRemove?.fileUrl) {
            try {
                // Extract path from public URL
                const urlParts = annexToRemove.fileUrl.split('proposal-annexes/');
                if (urlParts.length > 1) {
                    const filePath = decodeURIComponent(urlParts[1]);
                    await supabase.storage.from('proposal-annexes').remove([filePath]);
                }
            } catch (error) {
                console.error('Error deleting from storage:', error);
            }
        }
        onUpdate(annexes.filter(a => a.id !== annexId));
        toast.success('Annex removed');
    };

    const groupedAnnexes = {
        declaration: annexes.filter(a => a.type === 'declaration'),
        accession_form: annexes.filter(a => a.type === 'accession_form'),
        letter_of_intent: annexes.filter(a => a.type === 'letter_of_intent'),
        cv: annexes.filter(a => a.type === 'cv'),
    };

    return (
        <div className="space-y-6">
            {/* Upload Form */}
            <Card className="bg-card/40 border-border/40">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Upload Annex
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Document Type</Label>
                            <Select
                                value={newAnnex.type}
                                onChange={(e) => setNewAnnex({ ...newAnnex, type: e.target.value as Annex['type'] })}
                                className="w-full"
                            >
                                {ANNEX_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div>
                            <Label>Title (Optional)</Label>
                            <Input
                                value={newAnnex.title}
                                onChange={(e) => setNewAnnex({ ...newAnnex, title: e.target.value })}
                                placeholder="Custom title for this document"
                            />
                        </div>
                    </div>

                    {newAnnex.type === 'cv' && (
                        <div>
                            <Label>Associated Partner</Label>
                            <Select
                                value={newAnnex.partnerId || ''}
                                onChange={(e) => setNewAnnex({ ...newAnnex, partnerId: e.target.value })}
                                className="w-full"
                            >
                                <option value="">Select Partner</option>
                                {partners.map((partner, idx) => (
                                    <option key={partner.id || idx} value={partner.id || `partner-${idx}`}>
                                        {partner.name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}

                    <div>
                        <Label>Upload File</Label>
                        <Input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                            }}
                            disabled={isUploading}
                            className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Accepted formats: PDF, DOC, DOCX
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Annexes List */}
            <div className="space-y-4">
                {ANNEX_TYPES.map(type => {
                    const items = groupedAnnexes[type.value];
                    if (items.length === 0) return null;

                    return (
                        <Card key={type.value} className="bg-card/40 border-border/40">
                            <CardHeader>
                                <CardTitle className="text-base">{type.label}s</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {items.map(annex => (
                                        <div
                                            key={annex.id}
                                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40"
                                        >
                                            <div className="flex items-center gap-3 flex-1">
                                                <FileText className="h-5 w-5 text-primary" />
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{annex.title}</p>
                                                    {annex.partnerName && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Partner: {annex.partnerName}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground">
                                                        {annex.fileName} • {new Date(annex.uploadedAt || '').toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {annex.fileUrl && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(annex.fileUrl, '_blank')}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemove(annex.id!)}
                                                    className="hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {annexes.length === 0 && (
                    <Card className="bg-card/40 border-border/40 border-dashed">
                        <CardContent className="py-12">
                            <div className="text-center text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No annexes uploaded yet</p>
                                <p className="text-sm mt-1">Upload documents using the form above</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
