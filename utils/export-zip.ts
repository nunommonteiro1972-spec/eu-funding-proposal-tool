import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FullProposal } from '../types/proposal';
import { generateDocx } from './export-docx';
import { supabase } from './supabase';

export interface ZipExportOptions {
    includeProposal: boolean;
    includeAnnexes: boolean;
    includePlaceholders: boolean;
}

export async function exportToZip(
    proposal: FullProposal,
    options: ZipExportOptions = { includeProposal: true, includeAnnexes: true, includePlaceholders: true }
): Promise<void> {
    const zip = new JSZip();
    const proposalTitle = proposal.title?.replace(/[^a-z0-9]/gi, "_") || "proposal";
    const rootFolder = zip.folder(proposalTitle);

    // 1. Add the DOCX proposal if requested
    if (options.includeProposal) {
        try {
            const { blob: docxBlob, fileName: docxFileName } = await generateDocx(proposal);
            rootFolder?.file(docxFileName, docxBlob);
        } catch (error) {
            console.error("Failed to generate DOCX for ZIP:", error);
        }
    }

    // 2. Add Annexes if requested
    if (options.includeAnnexes) {
        const annexesFolder = rootFolder?.folder("Annexes");

        // Group by type for better organization
        const folders = {
            declaration: annexesFolder?.folder("Declarations_on_Honour"),
            accession_form: annexesFolder?.folder("Accession_Forms"),
            letter_of_intent: annexesFolder?.folder("Letters_of_Intent"),
            cv: annexesFolder?.folder("CVs")
        };

        if (proposal.annexes && proposal.annexes.length > 0) {
            for (const annex of proposal.annexes) {
                try {
                    let blob: Blob | null = null;

                    // Prefer downloading via Supabase client if we have a path
                    if (annex.filePath) {
                        const { data, error } = await supabase.storage
                            .from('proposal-annexes')
                            .download(annex.filePath);

                        if (error) {
                            console.error("DEBUG: Supabase download error", error);
                            throw error;
                        }
                        blob = data;
                    } else if (annex.fileUrl) {
                        console.log(`DEBUG: No filePath, attempting to extract from URL: ${annex.fileUrl}`);

                        // Check if it's a blob URL (which won't work across sessions)
                        if (annex.fileUrl.startsWith('blob:')) {
                            throw new Error("Local browser file (blob) is no longer accessible. Please re-upload this document.");
                        }

                        // Fallback to fetch if path is missing (for older entries)
                        const urlParts = annex.fileUrl.split('proposal-annexes/');
                        if (urlParts.length > 1) {
                            const extractedPath = decodeURIComponent(urlParts[1]);
                            console.log(`DEBUG: Extracted path: ${extractedPath}`);
                            const { data, error } = await supabase.storage
                                .from('proposal-annexes')
                                .download(extractedPath);
                            if (!error && data) {
                                blob = data;
                            } else {
                                console.log("DEBUG: Extracted path download failed, falling back to fetch");
                                const response = await fetch(annex.fileUrl);
                                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                                blob = await response.blob();
                            }
                        } else {
                            console.log("DEBUG: Could not extract path, using direct fetch");
                            const response = await fetch(annex.fileUrl);
                            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                            blob = await response.blob();
                        }
                    }

                    if (blob) {
                        const folder = folders[annex.type as keyof typeof folders] || annexesFolder;
                        const fileName = annex.fileName || `${annex.title}.pdf`;
                        folder?.file(fileName, blob);
                    } else {
                        throw new Error("No file path or URL available");
                    }
                } catch (error) {
                    console.error(`Failed to fetch annex: ${annex.title}`, error);
                    const isBlobError = String(error).includes('blob') || (annex.fileUrl?.startsWith('blob:'));
                    const errorMessage = isBlobError
                        ? "This file was stored locally in your browser and is no longer accessible. Please re-upload it."
                        : `Download failed: ${error instanceof Error ? error.message : String(error)}`;

                    if (options.includePlaceholders) {
                        const folder = folders[annex.type as keyof typeof folders] || annexesFolder;
                        folder?.file(`${annex.title}_DOWNLOAD_FAILED.txt`, `This file could not be downloaded: ${annex.fileName}\nURL: ${annex.fileUrl}\nReason: ${errorMessage}`);
                    }
                }
            }
        }

        // 3. Add placeholders for missing mandatory types if requested
        if (options.includePlaceholders) {
            const types = ['declaration', 'accession_form', 'letter_of_intent', 'cv'] as const;
            const existingTypes = new Set(proposal.annexes?.map(a => a.type) || []);

            for (const type of types) {
                if (!existingTypes.has(type)) {
                    const folderName = type === 'declaration' ? "Declarations_on_Honour" :
                        type === 'accession_form' ? "Accession_Forms" :
                            type === 'letter_of_intent' ? "Letters_of_Intent" : "CVs";
                    const folder = folders[type as keyof typeof folders] || annexesFolder?.folder(folderName);
                    folder?.file(`PLACEHOLDER_${type.toUpperCase()}.txt`, `No documents of type "${type.replace(/_/g, ' ')}" were uploaded for this proposal.`);
                }
            }
        }
    }

    // 4. Generate and download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const suffix = options.includeProposal && options.includeAnnexes ? "full_package" :
        options.includeAnnexes ? "annexes_only" : "proposal";

    saveAs(zipBlob, `${proposalTitle}_${suffix}_${Date.now()}.zip`);
}
