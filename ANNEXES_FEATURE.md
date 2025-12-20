# Annexes Feature Implementation

## Overview
The Annexes section allows users to upload and manage supporting documents for their proposals, including:
1. **Declaration on Honour** - Official declarations
2. **Accession Forms** - Partner accession documentation
3. **Letters of Intent** - Partner commitment letters
4. **CVs** - Team member curriculum vitae

## Implementation Details

### 1. Type Definitions (`types/proposal.ts`)

Added `Annex` interface:
```typescript
export interface Annex {
  id?: string;
  type: 'declaration' | 'accession_form' | 'letter_of_intent' | 'cv';
  title: string;
  fileName?: string;
  fileUrl?: string;
  uploadedAt?: string;
  partnerId?: string; // For CVs and partner-specific documents
  partnerName?: string;
}
```

Added `annexes` field to `FullProposal`:
```typescript
export interface FullProposal {
  // ... other fields
  annexes?: Annex[];
}
```

### 2. AnnexesManager Component (`components/AnnexesManager.tsx`)

**Features:**
- Upload form with document type selection
- Title customization
- Partner association (for CVs)
- File upload (PDF, DOC, DOCX)
- Grouped display by document type
- Download and delete functionality

**Props:**
- `proposalId`: Current proposal ID
- `annexes`: Array of existing annexes
- `partners`: List of partners for CV association
- `onUpdate`: Callback when annexes are updated

### 3. Integration in ProposalViewerPage

**Changes:**
1. Added "Annexes" tab to the tabs list
2. Added `<TabsContent value="annexes">` with `AnnexesManager` component
3. Implemented auto-save when annexes are updated
4. Imported `AnnexesManager` component

## User Flow

1. **Navigate to Annexes Tab**
   - Click "Annexes" tab in ProposalViewerPage

2. **Upload Document**
   - Select document type from dropdown
   - (Optional) Enter custom title
   - (For CVs) Select associated partner
   - Click file input and select file
   - File is automatically uploaded and saved

3. **View Documents**
   - Documents are grouped by type
   - Each document shows:
     - Title
     - File name
     - Upload date
     - Associated partner (for CVs)

4. **Download Document**
   - Click download icon to open/download file

5. **Remove Document**
   - Click trash icon to remove annex
   - Confirmation via toast notification

## Data Persistence

- Annexes are stored in the `proposal.annexes` array
- Updates are automatically saved to the database via PUT request
- File metadata is stored (URL, name, upload date)
- Files themselves are currently stored as blob URLs (TODO: implement proper file storage)

## Future Enhancements

### File Storage
Currently using blob URLs for demonstration. Next steps:
1. Implement Supabase Storage integration
2. Create `proposal-annexes` bucket
3. Upload files to storage and store public URLs
4. Add file size validation
5. Implement virus scanning

### Additional Features
- Bulk upload
- Template documents
- Version history
- Digital signatures
- Export annexes with DOCX

## DOCX Export Integration

The annexes will be included in the DOCX export as a final section listing all attached documents with their metadata.

## Database Schema

No migration needed - annexes are stored as JSONB in the existing `proposals` table under the `annexes` column (handled by KV store).

## Testing

To test the feature:
1. Open any proposal in ProposalViewerPage
2. Click "Annexes" tab
3. Upload a test PDF/DOC file
4. Verify it appears in the list
5. Test download and delete functionality
6. Refresh page to confirm persistence
