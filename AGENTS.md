# Code Style & Guidelines: Comments

All code comments must be concise, direct, and technically precise. Avoid verbose explanations, narrative prose, and redundant implementation details.

## Core Rules

1. **File-Level Overview**
   * Every file must start with a concise header (1–3 sentences) defining its primary responsibility and scope.
   * **TypeScript**: Use `/** @file ... */` at the very top.
   * **Python**: Use a top-level module docstring `"""..."""` as the first statement.

2. **Explain the "Why", Not the "How" or "What"**
   * Do not restate what static types, function signatures, or self-explanatory code already show.
   * Document non-obvious constraints, edge cases, and business logic invariants.

3. **No Framework or Database Lore**
   * Do not document framework defaults, database flags, or ORM internal settings unless critical to the caller.
   * Focus strictly on contract guarantees and preconditions.

4. **No Storytelling or UI Scenarios**
   * Do not write hypothetical user flows or narrative bug post-mortems.
   * State the technical rule directly.

5. **Syntax & Formatting**
   * **TypeScript / TSX**:
     * File header: `/** @file ... */`
     * TSDoc: `/** ... */` (1–2 sentences for types/functions). Avoid redundant `@param` if TypeScript types are self-describing.
     * Inline: `// ...` (only for non-obvious calculations or workarounds).
   * **Python**:
     * Module docstring: `"""Single-line or concise summary."""` at line 1.
     * Function docstrings: Follow PEP 257 / Google style (`Args:`, `Returns:` only when behavior is non-obvious).
     * Inline: `# ...`

6. **Section Dividers**
   * Use banner comments only in large files (100+ lines) with distinct logical stages.
   * **TypeScript**:
     ```typescript
     /* ---------------------------------- */
     /*             Section Name           */
     /* ---------------------------------- */
     ```
   * **Python**:
     ```python
     # ------------------------------------ #
     #              Section Name            #
     # ------------------------------------ #
     ```
   * Do not use in short files (< 100 lines) or single-purpose components.
