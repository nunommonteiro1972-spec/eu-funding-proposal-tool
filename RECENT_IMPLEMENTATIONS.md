# Recent Implementations Log

## Date: 2025-12-20

### 1. Annexes Management & Persistence
- **Feature:** Added a dedicated "Annexes" tab to the Proposal Viewer.
- **Components:** Created `AnnexesManager.tsx` for handling multi-type uploads (CVs, Declarations, etc.).
- **Storage:** Integrated Supabase Storage with the `proposal-annexes` bucket.
- **Persistence:** Annex metadata is now stored within the `FullProposal` object in the database.

### 2. ZIP Export (Full Package)
- **Feature:** Implemented a "Full Package" export option.
- **Logic:** Created `export-zip.ts` to bundle the generated DOCX proposal with all uploaded annexes.
- **Resilience:** Added placeholder handling for missing mandatory documents to ensure the ZIP always generates.

### 3. Associated Partners Management
- **Feature:** Created a new "Associated Partners" management page.
- **Functionality:** Allows users to store partner logos, contact details, and custom Letter of Support templates.
- **Integration:** Added navigation links and database support for associated partners.

### 4. Proposal Copilot (Agentic AI)
- **Backend:** Deployed `proposal-copilot` Edge Function to Supabase.
- **Frontend:** Integrated `ProposalCopilot.tsx` as a floating sidebar in the Proposal Viewer.
- **Action Support:** The AI can now automatically update proposal sections based on user chat instructions.

## Date: 2025-12-08

### 1. Dynamic Funding Scheme Template Parsing
- **Feature:** Implemented automatic extraction of funding scheme structures from PDF/DOCX using Gemini AI.
- **Backend:**
    - Updated `parse-funding-template` Edge Function to use `gemini-2.5-pro`.
    - Fixed RLS policies on `funding_schemes` table.
- **Frontend:**
    - Refactored `FundingSchemeTemplateParser.tsx` with Shadcn UI.

### 2. Next Steps (To-Do)
- **Character Count Validation:** Implement visual limits for dynamic sections in the viewer.
- **Final Security Audit:** Review RLS policies for the new storage buckets.
