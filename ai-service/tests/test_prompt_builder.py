from datetime import UTC, datetime

from app.services.prompt_builder import PromptBuilder


def test_prompt_builder():

    builder = PromptBuilder()

    user_question = "How much did I spend?"
    context = "January expenses: 200 EUR"
    prompt = builder.build(user_question, context)

    assert user_question in prompt
    assert context in prompt


def test_prompt_contains_current_date():
    builder = PromptBuilder()
    prompt = builder.build("What is the current month?", "")
    assert datetime.now(UTC).astimezone().date().isoformat() in prompt
    assert "{{current_date}}" not in prompt
