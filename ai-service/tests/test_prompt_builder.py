from app.services.prompt_builder import PromptBuilder


def test_prompt_builder():

    builder = PromptBuilder()

    user_question = "How much did I spend?"
    context = "January expenses: 200 EUR"
    prompt = builder.build(
        today="2026-10-20", user_question=user_question, context=context
    )

    assert user_question in prompt
    assert context in prompt
    assert "2026-10-20" in prompt
    assert "{{current_date}}" not in prompt


def test_placeholders_are_filled_in_one_pass():
    prompt = PromptBuilder().build(
        today="2026-10-20", user_question="{{context}}", context="SECRET DATA"
    )

    assert (
        prompt.count("SECRET DATA") == 1
    )  # the user's "{{context}}" was NOT re-substituted
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
