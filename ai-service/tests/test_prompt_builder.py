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
    now = datetime.now(UTC).astimezone()
    prompt = builder.build("What is the current month?", "")
    assert f"{now:%A} {now.day} {now:%B %Y}" in prompt
    assert "{{current_date}}" not in prompt


def test_prompt_contains_formatting_rules():
    builder = PromptBuilder()
    prompt = builder.build("How much did I spend?", "")
    assert "€5.000,00" in prompt
    assert "**bold**" in prompt
    assert "21 October 2026" in prompt
