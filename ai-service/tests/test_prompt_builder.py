from app.services.prompt_builder import PromptBuilder


def test_prompt_builder():

    builder = PromptBuilder()

    prompt = builder.build(
        user_question="How much did I spend?",
        context="January expenses: 200 EUR"
    )

    print(prompt)

if __name__ == "__main__":
    test_prompt_builder()