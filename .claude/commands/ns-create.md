# Establish Project North Star

Create the immutable North Star document for project: $ARGUMENTS

## Pre-Creation Context Discovery (MANDATORY)

**ALWAYS perform these steps first:**

1. **Read Existing Documentation** (MANDATORY - NO CREATION WITHOUT THIS):
   - **FIRST**: Search and READ any existing North Stars in project hierarchy:
     - `./system/docs/000-*-NORTH_STAR.md` (system-level requirements)
     - `./modules/*/docs/000-*-NORTH_STAR.md` (module-level requirements)  
     - `./000-*-NORTH_STAR.md` (project root requirements)
   - Check for ./PROJECT_CONTEXT.md (current project state and priorities)
   - Review ./README.md for project overview and setup context
   - **CRITICAL**: If North Star already exists for this scope, UPDATE not CREATE

2. **Determine Optimal Location**:
   - If module-specific project: `./modules/[module-name]/docs/000-{PROJECT}_{MODULE_NAME}-NORTH_STAR.md`
   - If system-level project: `./system/docs/000-{PROJECT}_SYSTEM-NORTH_STAR.md`
   - If standalone project: `./000-{PROJECT_NAME}-NORTH_STAR.md`
   - **MANDATORY**: Use semantic namespacing pattern: `000-{PROJECT}_{SCOPE}-NORTH_STAR.md`

3. **Integration Context Analysis**:
   - Identify existing systems this project must integrate with
   - Note architectural constraints from existing codebase
   - Understand technology stack requirements and limitations
   - Document dependency relationships with other components

## Document Creation Requirements

Create the North Star with comprehensive context integration:

### **Core Content (REQUIRED)**
1. **Project Name**: $ARGUMENTS with full context
2. **Core Requirements**: What MUST this deliver? (grounded in existing system reality)
3. **Essential Functionality**: Non-negotiable features (validated against technical constraints)
4. **Value Propositions**: Primary value creation (aligned with system objectives)
5. **Success Criteria**: Measurable outcomes (testable and realistic)
6. **Constraints**: Boundaries that must be respected (technical + business + timeline)

### **Enhanced Sections (MANDATORY)**
7. **Integration Requirements**: How this fits with existing systems and workflows
8. **Technical Dependencies**: Required infrastructure, libraries, services, APIs
9. **Architectural Alignment**: Consistency with existing system patterns and principles
10. **Timeline & Milestones**: Realistic development phases and checkpoints
11. **Risk Assessment**: Known technical, business, and timeline risks with mitigation strategies

### **Context Validation (ENFORCE)**
- **Reality Grounding**: All requirements must be achievable within existing constraints
- **Integration Feasibility**: Verify compatibility with existing architecture
- **Resource Validation**: Confirm timeline and complexity are realistic for available resources
- **Stakeholder Alignment**: Ensure requirements serve actual business needs from context

## Quality Standards (NON-NEGOTIABLE)

- **Specificity**: All requirements must be concrete and measurable, not abstract
- **Traceability**: Every requirement must trace back to discovered context or business need
- **Testability**: Success criteria must be objectively verifiable
- **Completeness**: All integration points and dependencies must be explicitly documented
- **Immutability**: Mark as IMMUTABLE with explicit change approval requirement

## Output Requirements

After creation:
1. **Confirm North Star establishment** with file location and key requirements summary
2. **Validate readiness** for workflow phases based on context analysis
3. **Highlight critical integration points** that will drive implementation decisions
4. **Identify immediate next steps** based on discovered context and priorities

**CRITICAL**: Never create a North Star in isolation - always ground it in discovered project context and existing system reality.