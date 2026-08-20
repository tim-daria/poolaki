from app.services.prompt_builder import PromptBuilder


def test_prompt_builder():

    builder = PromptBuilder()

    prompt = builder.build(
        user_question="How much did I spend?", context="January expenses: 200 EUR"
    )

    assert user_question in prompt
    assert contest in prompt