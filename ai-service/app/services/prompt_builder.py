import re
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
        today: date,
        user_question: str,
        context: str = "",
    ) -> str:

        values = {
            # "Wednesday 21 October 2026"; `today.day` instead of the glibc-only `%-d`
            "current_date": f"{today:%A} {today.day} {today:%B %Y}",
            "context": context if context.strip() else NO_CONTEXT,
            "user_question": user_question,
        }

        prompt = f"{self.base_system}\n\n{self.financial_assistant}"

        return re.sub(
            r"\{\{(\w+)\}\}",
            lambda m: values.get(m.group(1), m.group(0)),
            prompt,
        )
