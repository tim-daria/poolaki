from datetime import date

from app.services.prompt_builder import PromptBuilder

TODAY = date(2026, 10, 20)


def test_prompt_builder():

    builder = PromptBuilder()

    user_question = "How much did I spend?"
    context = "January expenses: 200 EUR"
    prompt = builder.build(today=TODAY, user_question=user_question, context=context)

    assert user_question in prompt
    assert context in prompt
    assert "Tuesday 20 October 2026" in prompt
    assert "{{current_date}}" not in prompt


def test_placeholders_are_filled_in_one_pass():
    prompt = PromptBuilder().build(
        today=TODAY, user_question="{{context}}", context="SECRET DATA"
    )

    assert (
        prompt.count("SECRET DATA") == 1
    )  # the user's "{{context}}" was NOT re-substituted


def test_prompt_contains_formatting_rules():
    prompt = PromptBuilder().build(today=date(2026, 10, 21), user_question="How much did I spend?")

    assert "€5.000,00" in prompt
    assert "**bold**" in prompt
