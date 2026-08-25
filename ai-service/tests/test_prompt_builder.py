from app.services.prompt_builder import PromptBuilder


def test_prompt_builder():

    builder = PromptBuilder()

    user_question = "How much did I spend?"
    context = "January expenses: 200 EUR"
    prompt = builder.build(user_question, context)

    assert user_question in prompt
    assert context in prompt
