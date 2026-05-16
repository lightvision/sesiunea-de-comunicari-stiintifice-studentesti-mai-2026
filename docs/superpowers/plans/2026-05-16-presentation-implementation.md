# Presentation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 22-slide Quarto RevealJS presentation from the manuscript, with concise visible content and detailed speaker notes.

**Architecture:** Keep all presentation logic in `presentation.qmd`. Reuse existing manuscript figures and local image assets rather than regenerating graphics. Organize the deck into a theory block, four example/demo blocks, and a closing synthesis block.

**Tech Stack:** Quarto, RevealJS, Markdown, local PNG assets

---

## Chunk 1: Planning Artifacts

### Task 1: Add the presentation spec

**Files:**
- Create: `docs/superpowers/specs/2026-05-16-presentation-design.md`

- [ ] **Step 1: Write the approved design into the spec file**
- [ ] **Step 2: Save the file with the agreed 22-slide structure**

### Task 2: Add the implementation plan

**Files:**
- Create: `docs/superpowers/plans/2026-05-16-presentation-implementation.md`

- [ ] **Step 1: Write the execution plan**
- [ ] **Step 2: Save the file in the plans directory**

## Chunk 2: Presentation File

### Task 3: Replace the placeholder presentation with the approved deck

**Files:**
- Modify: `presentation.qmd`

- [ ] **Step 1: Replace the placeholder YAML with RevealJS metadata appropriate for the talk**
- [ ] **Step 2: Add slides 1-10 for the theory block**
- [ ] **Step 3: Add slides 11-21 for the examples, demos, and observations**
- [ ] **Step 4: Add slide 22 for conclusions and questions**
- [ ] **Step 5: Add `::: notes` content under every slide**
- [ ] **Step 6: Reuse stable local images already present in the repository**

## Chunk 3: Verification

### Task 4: Render and inspect the presentation

**Files:**
- Verify: `presentation.qmd`

- [ ] **Step 1: Render the presentation**

Run: `.\.venv\Scripts\quarto.exe render .\presentation.qmd`
Expected: exit code `0` and `_site/presentation.html` created

- [ ] **Step 2: Verify that notes and images are present in the rendered output**

Run: `Select-String -Path _site\presentation.html -Pattern 'speaker-notes|genetic_algorithm_flow|article-figures|screenshot_20260516_042826'`
Expected: matches for notes and image references
