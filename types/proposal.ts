// Proposal-related type definitions

import type { FundingScheme, DynamicSections } from './funding-scheme';

export interface Idea {
  title: string;
  description: string;
}

export interface Constraints {
  partners: string;
  budget: string;
  duration: string;
}

export interface AnalysisResult {
  summary: string;
  constraints: Constraints;
  ideas: Idea[];
}

export interface RelevanceAnalysis {
  score: 'Good' | 'Fair' | 'Poor';
  justification: string;
}

export interface Partner {
  name: string;
  role: string;
  organisationId?: string;
  country?: string;
  city?: string; // May not always be populated depending on backend
  description?: string;
  experience?: string;
  organizationType?: string;
  website?: string;
}

export interface WorkPackage {
  name: string;
  description: string;
  deliverables: string[];
}

export interface Milestone {
  milestone: string;
  workPackage: string;
  dueDate: string;
}

export interface Risk {
  risk: string;
  likelihood: string;
  impact: string;
  mitigation: string;
}

export interface BudgetBreakdown {
  subItem: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface BudgetItem {
  item: string;
  cost: number;
  description: string;
  breakdown?: BudgetBreakdown[];
}

export interface TimelinePhase {
  phase: string;
  activities: string[];
  startMonth: number;
  endMonth: number;
}

export interface TechnicalLayer {
  layer: string;
  technologies: string;
  description: string;
}

export interface Annex {
  id?: string;
  type: 'declaration' | 'accession_form' | 'letter_of_intent' | 'cv' | 'generated_letter';
  title: string;
  fileName?: string;
  fileUrl?: string;
  filePath?: string;
  uploadedAt?: string;
  partnerId?: string; // For CVs and partner-specific documents
  partnerName?: string;
  associatedPartnerId?: string; // For generated letters
}

export interface AssociatedPartner {
  id: string;
  name: string;
  logoUrl?: string;
  contactPerson?: string;
  role?: string;
  email?: string;
  phone?: string;
  address?: string;
  templateUrl?: string;
  templatePath?: string;
  createdAt?: string;
}

export interface FullProposal {
  // Core Fields
  id?: string;
  title: string;
  finalProjectName?: string;
  projectAcronym?: string;
  summary: string;

  // NEW: Funding Scheme Support (optional - for backward compatibility)
  funding_scheme_id?: string; // Link to funding scheme template
  funding_scheme?: FundingScheme; // Populated funding scheme object (from join)
  dynamic_sections?: DynamicSections; // Dynamic content: { "excellence": "text...", "impact": "text..." }

  // Legacy hardcoded sections (kept for backward compatibility)
  relevance: string;
  methods: string;
  impact: string;
  introduction?: string;
  objectives?: string;
  methodology?: string;
  expectedResults?: string;
  innovation?: string;
  sustainability?: string;
  consortium?: string;
  workPlan?: string;
  riskManagement?: string;
  dissemination?: string;

  // Structured Data
  partners: Partner[];
  workPackages: WorkPackage[];
  milestones: Milestone[];
  risks: Risk[];
  budget: BudgetItem[];
  timeline: TimelinePhase[];
  customSections?: { id: string; title: string; content: string }[];
  technicalOverview?: TechnicalLayer[] | string;


  // Annexes
  annexes?: Annex[];
  associatedPartnerIds?: string[]; // IDs of associated partners selected for this proposal

  // Metadata
  projectUrl?: string;
  selectedIdea?: Idea;
  generatedAt?: string;
  savedAt?: string;
  updatedAt?: string;
  settings?: ProposalSettings;
}

export interface ProposalSettings {
  currency: string;
  sourceUrl?: string;
  customParams?: { key: string; value: string }[];
}