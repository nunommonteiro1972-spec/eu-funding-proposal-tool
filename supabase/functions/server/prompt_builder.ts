// Prompt Builder module for AI integration
// Constructs prompts for Google Gemini API

export function buildPhase2Prompt(summary: string, constraints: any, userPrompt?: string): string {
  const basePrompt = userPrompt
    ? `You are a creative brainstorming assistant.

🎯 MANDATORY USER REQUIREMENTS - HIGHEST PRIORITY:
${userPrompt}

CRITICAL: ALL project ideas MUST directly address these user requirements.
============================================================

CONTEXT SUMMARY: ${summary}

CONSTRAINTS:
- Partners: ${constraints.partners || 'Not specified'}
- Budget: ${constraints.budget || 'Not specified'}
- Duration: ${constraints.duration || 'Not specified'}

TASK: Generate 6-10 high-quality project ideas that DIRECTLY address the user requirements above.

Each idea must:
1. Clearly relate to the user's requirements
2. Be feasible within the constraints
3. Be innovative and impactful

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no backticks) with this structure:
{
  "ideas": [
    {
      "title": "Project idea title clearly related to user requirements",
      "description": "Detailed description (2-3 sentences) showing how this fulfills the user requirements"
    }
  ]
}

Return ONLY valid JSON, no other text.`
    : `You are a creative brainstorming assistant.

CONTEXT SUMMARY: ${summary}

CONSTRAINTS:
- Partners: ${constraints.partners || 'Not specified'}
- Budget: ${constraints.budget || 'Not specified'}
- Duration: ${constraints.duration || 'Not specified'}

TASK: Generate 6-10 innovative project ideas based on the context summary.

Each idea should:
1. Align with the funding opportunity
2. Be feasible within the constraints
3. Be innovative and impactful

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no backticks) with this structure:
{
  "ideas": [
    {
      "title": "Project idea title",
      "description": "Detailed description (2-3 sentences)"
    }
  ]
}

Return ONLY valid JSON, no other text.`;

  return basePrompt;
}

export function buildRelevancePrompt(
  url: string,
  urlContent: string,
  constraints: any,
  ideas: any[],
  userPrompt?: string
): string {
  const basePrompt = userPrompt
    ? `Validate these project ideas against the user requirements and source content.

USER REQUIREMENTS (PRIMARY CRITERION):
${userPrompt}

SOURCE URL: ${url}
SOURCE CONTENT: ${urlContent.substring(0, 5000)}

PROJECT IDEAS:
${JSON.stringify(ideas, null, 2)}

TASK: Evaluate how well the ideas address the user requirements AND align with the source content.

Scoring:
- "Good": Ideas strongly address user requirements and align with source
- "Fair": Ideas partially address requirements or have moderate alignment
- "Poor": Ideas miss user requirements or don't align with source

OUTPUT FORMAT (JSON ONLY):
{
  "score": "Good" | "Fair" | "Poor",
  "justification": "Explain why the ideas match or miss the requirements and source content"
}

Return ONLY valid JSON, no other text.`
    : `Validate these project ideas against the source content.

SOURCE URL: ${url}
SOURCE CONTENT: ${urlContent.substring(0, 5000)}

PROJECT IDEAS:
${JSON.stringify(ideas, null, 2)}

CONSTRAINTS:
${JSON.stringify(constraints, null, 2)}

TASK: Evaluate how well the ideas align with the source content and constraints.

Scoring:
- "Good": Ideas strongly align with source and constraints
- "Fair": Ideas partially align
- "Poor": Ideas don't align well

OUTPUT FORMAT (JSON ONLY):
{
  "score": "Good" | "Fair" | "Poor",
  "justification": "Explain the alignment assessment"
}

Return ONLY valid JSON, no other text.`;

  return basePrompt;
}

export function buildProposalPrompt(
  idea: any,
  summary: string,
  constraints: any,
  partners: any[] = [],
  userPrompt?: string,
  fundingScheme?: any
): string {
  const partnerInfo = partners.length > 0
    ? `\n\nCONSORTIUM PARTNERS:\n${partners.map(p => `- ${p.name} (${p.country || 'Country not specified'}): ${p.description || 'No description'}`).join('\n')}`
    : '';

  const userRequirements = userPrompt
    ? `\n\n🎯 MANDATORY USER REQUIREMENTS - MUST BE ADDRESSED IN ALL SECTIONS:\n${userPrompt}\n============================================================`
    : '';

  const targetBudget = constraints.budget || "Not specified";

  // If we have a funding scheme, we use its sections. 
  // We also keep some core fields like title, summary, etc.
  const dynamicSchemeInstructions = fundingScheme
    ? `\n\nFUNDING SCHEME TEMPLATE (${fundingScheme.name}):
The proposal MUST follow this specific structure. Generate content for the following sections inside a "dynamicSections" object (as per keys defined below):
${fundingScheme.template_json.sections.map((s: any) =>
      `- ${s.label} (Key: "${s.key}"): ${s.description}${s.charLimit ? ` [Limit: ${s.charLimit} chars]` : ''}`
    ).join('\n')}`
    : '';

  const dynamicOutputFormat = fundingScheme
    ? `\n  "dynamicSections": {
${fundingScheme.template_json.sections.map((s: any) => `    "${s.key}": "<p>Content for ${s.label}...</p>"`).join(',\n')}
  },`
    : '';

  // Base output format without redundant sections if scheme is present
  const baseSections = fundingScheme
    ? `"summary": "<p>Executive summary...</p>",${dynamicOutputFormat}`
    : `"summary": "<p>Executive summary...</p>",
  "relevance": "<p>Why this project is relevant...</p>",
  "impact": "<p>Expected impact...</p>",
  "methods": "<p>Methodology...</p>",
  "introduction": "<p>Introduction...</p>",
  "objectives": "<p>Project objectives...</p>",
  "methodology": "<p>Detailed methodology...</p>",
  "expectedResults": "<p>Expected results...</p>",
  "innovation": "<p>Innovation aspects...</p>",
  "sustainability": "<p>Sustainability plan...</p>",
  "consortium": "<p>Consortium description...</p>",
  "workPlan": "<p>Work plan...</p>",
  "riskManagement": "<p>Risk management...</p>",
  "dissemination": "<p>Dissemination and communication strategy...</p>",`;

  return `You are an expert EU funding proposal writer.

SELECTED PROJECT IDEA:
Title: ${idea.title}
Description: ${idea.description}

CONTEXT: ${summary}

### 🚨 HARD PROJECT CONSTRAINTS (CRITICAL - NO EXCEPTIONS) 🚨 ###
- EXACT TARGET BUDGET: €${targetBudget}
- PARTNERS: ${constraints.partners || 'Not specified'}
- DURATION: ${constraints.duration || 'Not specified'}
${partnerInfo}${userRequirements}${dynamicSchemeInstructions}

### 🛑 BUDGET ADHERENCE RULES (MANDATORY):
1. THE TOTAL SUM OF ALL 'cost' VALUES IN THE 'budget' ARRAY MUST BE EXACTLY €${targetBudget}. NOT ONE CENT MORE, NOT ONE CENT LESS.
2. If you include sub-items with quantity and unitCost, the 'total' for that sub-item MUST be (quantity * unitCost).
3. The 'cost' for a category MUST be the sum of its sub-item 'total' values.
4. THE OVERALL TOTAL (sum of all category 'cost' fields) MUST EQUAL EXACTLY €${targetBudget}.
5. MATH VERIFICATION: You must perform a final mental tally. Fail this and the proposal is invalid.

### OUTPUT FORMAT (JSON ONLY):
{
  "title": "${idea.title}",
  ${baseSections}
  "partners": [
    { "name": "Partner Name", "role": "Role in project" }
  ],
  "workPackages": [
    {
      "name": "WP1: Work Package Name",
      "description": "Description",
      "deliverables": ["Deliverable 1", "Deliverable 2"]
    }
  ],
  "milestones": [
    {
      "milestone": "Milestone description",
      "workPackage": "WP1",
      "dueDate": "Month 6"
    }
  ],
  "risks": [
    {
      "risk": "Risk description",
      "likelihood": "Low|Medium|High",
      "impact": "Low|Medium|High",
      "mitigation": "Mitigation strategy"
    }
  ],
  "budget": [
    {
      "category": "Project Management",
      "cost": 50000,
      "breakdown": [
        { "subItem": "Coordination", "quantity": 1, "unitCost": 30000, "total": 30000 },
        { "subItem": "Meetings", "quantity": 4, "unitCost": 5000, "total": 20000 }
      ]
    }
  ],
  "timeline": [
    { "phase": "M1-M6", "activity": "Research & Design" }
  ]
}

Return ONLY valid JSON (no markdown, no other text).`;
}