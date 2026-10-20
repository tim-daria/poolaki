from pydantic import BaseModel


class LLMUsage(BaseModel):
    """Tokens reported by the provider for ONE LLM call."""

    input_tokens: int = 0
    output_tokens: int = 0


class TokenUsage(BaseModel):
    intent_in: int = 0
    intent_out: int = 0
    embedding: int = 0
    context_est: int = 0
    final_in: int = 0
    final_out: int = 0

    @property
    def total(self) -> int:
        return (
            self.intent_in
            + self.intent_out
            + self.embedding
            + self.final_in
            + self.final_out
        )
