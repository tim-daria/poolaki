-- SQL structure proposal for the transaction ledger and reversal support

-- 1. Transaction ledger table
CREATE TABLE IF NOT EXISTS transaction (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    goal_id BIGINT NULL,
    category_id BIGINT NULL,
    created_by_id BIGINT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- reversal support
    reversal_of_id BIGINT NULL,
    is_reversal BOOLEAN NOT NULL DEFAULT FALSE,
    -- set explicitly when a reversal row is created
    reversed_at TIMESTAMP WITH TIME ZONE NULL,
    reversed_by_id BIGINT NULL,

    CONSTRAINT fk_transaction_organization
        FOREIGN KEY (organization_id) REFERENCES organisation(id),

    CONSTRAINT fk_transaction_goal
        FOREIGN KEY (goal_id) REFERENCES goal(id),

    CONSTRAINT fk_transaction_category
        FOREIGN KEY (category_id) REFERENCES category(id),

    CONSTRAINT fk_transaction_reversal_of
        FOREIGN KEY (reversal_of_id) REFERENCES transaction(id)
);

-- 2. Useful indexes
CREATE INDEX IF NOT EXISTS idx_transaction_organization_created_at
    ON transaction (organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_transaction_goal_created_at
    ON transaction (goal_id, created_at);

CREATE INDEX IF NOT EXISTS idx_transaction_reversal_of
    ON transaction (reversal_of_id);

CREATE INDEX IF NOT EXISTS idx_transaction_is_reversal
    ON transaction (is_reversal);

-- 3. Example: create a normal ledger entry
INSERT INTO transaction (
    organization_id,
    goal_id,
    category_id,
    created_by_id,
    description,
    amount,
    is_reversal,
    reversal_of_id
) VALUES (
    1,
    NULL,
    NULL,
    100,
    'Organization deposit',
    500.00,
    FALSE,
    NULL
);

-- 4. Example: create a reversal entry for an existing transaction
INSERT INTO transaction (
    organization_id,
    goal_id,
    category_id,
    created_by_id,
    description,
    amount,
    is_reversal,
    reversal_of_id,
    reversed_by_id,
    reversed_at
) VALUES (
    1,
    NULL,
    NULL,
    100,
    'Reversal of transaction 42',
    -500.00,
    TRUE,
    42,
    100,
    NOW()
);

-- 5. Example: view all effective transactions for reporting
-- This excludes reversal rows from normal reporting.
SELECT *
FROM transaction
WHERE is_reversal = FALSE;

-- 6. Example: get balance for an organization
SELECT COALESCE(SUM(amount), 0) AS balance
FROM transaction
WHERE organization_id = 1
  AND is_reversal = FALSE;

-- 7. Example: get reserved amount for a goal
SELECT COALESCE(SUM(ABS(amount)), 0) AS reserved_amount
FROM transaction
WHERE goal_id = 1
  AND is_reversal = FALSE
  AND amount < 0;
