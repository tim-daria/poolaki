# Build the final prompt before calling the LLM.
# This is where the context of the future RAG is injected.

# In put:
# {
#  "question": "How much did I spend?",
#  "context": "January expenses: 200€"
# }

# output:

# System prompt

# Context:
# January expenses: 200€

# Question:
# How much did I spend?

