from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
PROMPTS_PATH = APP_DIR / "prompts"


class PromptBuilder:
    def __init__(self):
        self.base_system = self._load("system_base.md")
        self.financial_assistant = self._load("financial_assistant_v0.md")
        # self.out_of_scope = self._load("rules/out_of_scope.md")

    def _load(self, path: str) -> str:
        file_path = PROMPTS_PATH / path
        if not file_path.exists():
            raise FileNotFoundError(f"prompt file not found: {file_path}")
        return file_path.read_text(encoding="utf-8")

    def build(
        self,
        user_question: str,
        context: str = "",
    ) -> str:

        if not context.strip():
            formatted_context = "Not relevant data found for your question"
        else:
            formatted_context = context
    
        prompt = "\n\n".join([
            self.base_system,
            self.financial_assistant,
            # self.out_of_scope,
        ])

        return (
            prompt.replace(
                "{{user_question}}",
                user_question
            )
            .replace(
                "{{context}}",
                context
            )
        )