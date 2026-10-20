from datetime import date
from pathlib import Path

from app.services.context_builder import NO_CONTEXT


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
        formatted_context = context if context.strip() else NO_CONTEXT

        prompt = f"{self.base_system}\n\n{self.financial_assistant}"

        return (
            prompt.replace("{{user_question}}""{{current_date}}", date.today().isoformat())
            .replace("{{user_question}}", user_question)
            .replace("{{context}}", formatted_context)
        )
