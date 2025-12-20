import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/primitives';
import {
    FileText,
    Archive,
    Files,
    Download,
    Loader2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { FullProposal } from '../types/proposal';

// Simple helper to join class names
function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

interface ExportOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (options: ExportOptions) => Promise<void>;
    proposal: FullProposal;
}

export interface ExportOptions {
    type: 'docx' | 'zip_full' | 'zip_annexes';
    includePlaceholders: boolean;
}

export function ExportOptionsModal({ isOpen, onClose, onExport, proposal }: ExportOptionsModalProps) {
    const [selectedType, setSelectedType] = useState<'docx' | 'zip_full' | 'zip_annexes'>('zip_full');
    const [includePlaceholders, setIncludePlaceholders] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await onExport({ type: selectedType, includePlaceholders });
            onClose();
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const annexCount = proposal.annexes?.length || 0;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isExporting && !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] bg-card border-primary/20 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Download className="h-6 w-6 text-primary" />
                        Export Options
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Choose how you want to download your proposal and supporting documents.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 gap-3">
                        {/* Option: Full Package */}
                        <Card
                            className={cn(
                                "p-4 cursor-pointer transition-all border-2 relative overflow-hidden group",
                                selectedType === 'zip_full'
                                    ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(122,162,247,0.15)]"
                                    : "border-border/40 hover:border-primary/40 hover:bg-secondary/20"
                            )}
                            onClick={() => setSelectedType('zip_full')}
                        >
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    selectedType === 'zip_full' ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                                )}>
                                    <Archive className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-foreground">Full Submission Package (ZIP)</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Includes the DOCX proposal and all {annexCount} uploaded annexes organized in folders.
                                    </p>
                                    {selectedType === 'zip_full' && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="text-[10px] uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">Recommended</span>
                                            <span className="text-[10px] uppercase tracking-wider bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-bold">Ready for Portal</span>
                                        </div>
                                    )}
                                </div>
                                {selectedType === 'zip_full' && (
                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                )}
                            </div>
                        </Card>

                        {/* Option: DOCX Only */}
                        <Card
                            className={cn(
                                "p-4 cursor-pointer transition-all border-2 relative group",
                                selectedType === 'docx'
                                    ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(122,162,247,0.15)]"
                                    : "border-border/40 hover:border-primary/40 hover:bg-secondary/20"
                            )}
                            onClick={() => setSelectedType('docx')}
                        >
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    selectedType === 'docx' ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                                )}>
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-foreground">Proposal Only (DOCX)</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Download only the narrative proposal document.
                                    </p>
                                </div>
                                {selectedType === 'docx' && (
                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                )}
                            </div>
                        </Card>

                        {/* Option: Annexes Only */}
                        <Card
                            className={cn(
                                "p-4 cursor-pointer transition-all border-2 relative group",
                                selectedType === 'zip_annexes'
                                    ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(122,162,247,0.15)]"
                                    : "border-border/40 hover:border-primary/40 hover:bg-secondary/20"
                            )}
                            onClick={() => setSelectedType('zip_annexes')}
                        >
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    selectedType === 'zip_annexes' ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                                )}>
                                    <Files className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-foreground">Annexes Only (ZIP)</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Bundle all {annexCount} uploaded documents without the main proposal.
                                    </p>
                                </div>
                                {selectedType === 'zip_annexes' && (
                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                )}
                            </div>
                        </Card>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 px-1">
                        <Checkbox
                            id="placeholders"
                            checked={includePlaceholders}
                            onCheckedChange={(checked) => setIncludePlaceholders(!!checked)}
                        />
                        <div className="grid gap-1.5 leading-none pl-2">
                            <Label
                                htmlFor="placeholders"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Include placeholders for missing documents
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Adds a note for mandatory annexes that haven't been uploaded yet.
                            </p>
                        </div>
                    </div>

                    {annexCount === 0 && selectedType !== 'docx' && (
                        <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-500 text-xs">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>No annexes have been uploaded yet. The ZIP will only contain placeholders.</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isExporting}
                        className="hover:bg-secondary"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Start Export
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
