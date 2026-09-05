# Code Style & Guidelines: Comments

All code comments must be concise, direct, and technically precise. Avoid verbose explanations, narrative prose, and redundant implementation details.

## Core Rules

1. **Explain the "Why", Not the "How" or "What"**
   * Do not restate what TypeScript types or the code itself clearly show.
   * Document non-obvious constraints, edge cases, and business logic invariants.

2. **No Backend or Framework Lore**
   * Do not explain backend implementation details, framework defaults, or database settings (e.g., avoid mentions of `blank=True`, `DRF settings`, `on_delete=SET_NULL`, or Django internal class names).
   * Focus strictly on what the frontend/client code needs to know (e.g., write "Category ID. Null if unselected" instead of "FK to Category table").

3. **No Storytelling or UI Scenarios**
   * Do not write narrative stories, hypothetical user journeys, or visual bug descriptions (e.g., avoid "if a user clicks tab A then tab B they might submit X").
   * State the technical rule directly: "Resets incompatible fields to prevent submitting invalid state."

4. **Formatting & Length**
   * **TSDoc (`/** ... */`)**: Keep type and function headers to 1–2 sentences.
   * **Property comments**: Single-line summaries only.
   * **Inline comments (`// ...`)**: Use only for subtle workarounds or non-obvious calculations. Do not comment trivial statements.