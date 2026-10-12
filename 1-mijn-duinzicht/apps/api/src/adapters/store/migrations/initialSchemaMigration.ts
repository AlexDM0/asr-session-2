const CALENDAR_DATE_GLOB = '\'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]\'';
const LOCAL_DATE_TIME_GLOB = '\'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]\'';
const LOCAL_DATE_TIME_WITH_SECONDS_GLOB = '\'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]\'';

const CUSTOMER_TABLES = [
  `CREATE TABLE customer (
    customer_number TEXT PRIMARY KEY CHECK (customer_number GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
    full_name TEXT NOT NULL CHECK (full_name <> ''),
    first_name TEXT NOT NULL CHECK (first_name <> ''),
    initials TEXT NOT NULL CHECK (initials <> ''),
    birth_date TEXT NOT NULL CHECK (birth_date GLOB ${CALENDAR_DATE_GLOB}),
    email_address TEXT NOT NULL CHECK (email_address <> ''),
    email_address_needs_confirmation INTEGER NOT NULL CHECK (email_address_needs_confirmation IN (0, 1)),
    email_address_last_confirmed_year INTEGER NOT NULL CHECK (email_address_last_confirmed_year BETWEEN 1900 AND 9999),
    phone_number TEXT NOT NULL CHECK (phone_number <> ''),
    street_and_house_number TEXT NOT NULL CHECK (street_and_house_number <> ''),
    postcode TEXT NOT NULL CHECK (postcode <> ''),
    city TEXT NOT NULL CHECK (city <> ''),
    iban TEXT NOT NULL CHECK (iban <> ''),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('monthlyDirectDebit')),
    account_holder TEXT NOT NULL CHECK (account_holder <> '')
  ) STRICT`,
  `CREATE TABLE preferences (
    customer_number TEXT PRIMARY KEY REFERENCES customer (customer_number),
    paper_mail INTEGER NOT NULL CHECK (paper_mail IN (0, 1)),
    newsletter INTEGER NOT NULL CHECK (newsletter IN (0, 1)),
    claim_update_text_messages INTEGER NOT NULL CHECK (claim_update_text_messages IN (0, 1))
  ) STRICT`,
  `CREATE TABLE direct_debit_schedule (
    customer_number TEXT PRIMARY KEY REFERENCES customer (customer_number),
    next_collection_date TEXT NOT NULL CHECK (next_collection_date GLOB ${CALENDAR_DATE_GLOB})
  ) STRICT`,
] as const;

const POLICY_TABLES = [
  `CREATE TABLE policy (
    policy_id TEXT PRIMARY KEY CHECK (policy_id <> ''),
    customer_number TEXT NOT NULL REFERENCES customer (customer_number),
    position INTEGER NOT NULL UNIQUE CHECK (position >= 1),
    kind TEXT NOT NULL CHECK (kind IN ('home', 'contents', 'car', 'liability')),
    name TEXT NOT NULL CHECK (name <> ''),
    subtitle TEXT NOT NULL CHECK (subtitle <> ''),
    monthly_premium_cents INTEGER NOT NULL CHECK (monthly_premium_cents >= 0),
    status TEXT NOT NULL CHECK (status IN ('active', 'ended'))
  ) STRICT`,
  `CREATE TABLE policy_fact (
    policy_id TEXT NOT NULL REFERENCES policy (policy_id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 1),
    label TEXT NOT NULL CHECK (label <> ''),
    value TEXT NOT NULL CHECK (value <> ''),
    PRIMARY KEY (policy_id, position)
  ) STRICT`,
  `CREATE TABLE policy_coverage_item (
    policy_id TEXT NOT NULL REFERENCES policy (policy_id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 1),
    description TEXT NOT NULL CHECK (description <> ''),
    PRIMARY KEY (policy_id, position)
  ) STRICT`,
] as const;

const CLAIM_AND_MESSAGE_TABLES = [
  `CREATE TABLE claim (
    claim_id TEXT PRIMARY KEY CHECK (claim_id GLOB 'S-[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]'),
    customer_number TEXT NOT NULL REFERENCES customer (customer_number),
    policy_id TEXT NOT NULL REFERENCES policy (policy_id),
    title TEXT NOT NULL CHECK (title <> ''),
    category TEXT NOT NULL CHECK (category IN ('home', 'car', 'travel', 'liability')),
    reported_at TEXT NOT NULL CHECK (reported_at GLOB ${LOCAL_DATE_TIME_GLOB}),
    status TEXT NOT NULL CHECK (status IN ('reported', 'inProgress', 'paidOut', 'rejected')),
    handler_name TEXT CHECK (handler_name IS NULL OR handler_name <> ''),
    incident_date TEXT CHECK (incident_date IS NULL OR incident_date GLOB ${CALENDAR_DATE_GLOB}),
    description TEXT,
    photo_deadline TEXT CHECK (photo_deadline IS NULL OR photo_deadline GLOB ${CALENDAR_DATE_GLOB})
  ) STRICT`,
  `CREATE TABLE claim_step (
    claim_id TEXT NOT NULL REFERENCES claim (claim_id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 1),
    title TEXT NOT NULL CHECK (title <> ''),
    description TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('done', 'current', 'todo')),
    waits_for_photos INTEGER NOT NULL CHECK (waits_for_photos IN (0, 1)),
    PRIMARY KEY (claim_id, position)
  ) STRICT`,
  'CREATE UNIQUE INDEX claim_step_single_current ON claim_step (claim_id) WHERE state = \'current\'',
  `CREATE TABLE claim_photo (
    photo_id TEXT PRIMARY KEY CHECK (photo_id <> ''),
    claim_id TEXT NOT NULL REFERENCES claim (claim_id) ON DELETE CASCADE,
    original_file_name TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image/jpeg', 'image/png', 'image/heic')),
    size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
    stored_file_name TEXT NOT NULL UNIQUE,
    uploaded_at TEXT NOT NULL CHECK (uploaded_at GLOB ${LOCAL_DATE_TIME_WITH_SECONDS_GLOB})
  ) STRICT`,
  `CREATE TABLE message (
    message_id TEXT PRIMARY KEY CHECK (message_id <> ''),
    customer_number TEXT NOT NULL REFERENCES customer (customer_number),
    title TEXT NOT NULL CHECK (title <> ''),
    sent_on TEXT NOT NULL CHECK (sent_on GLOB ${CALENDAR_DATE_GLOB}),
    is_read INTEGER NOT NULL CHECK (is_read IN (0, 1)),
    body TEXT NOT NULL
  ) STRICT`,
] as const;

/** Structure version 1: every table and index of the portal store, in an order that satisfies the foreign keys. */
export const INITIAL_SCHEMA_STATEMENTS: readonly string[] = [...CUSTOMER_TABLES, ...POLICY_TABLES, ...CLAIM_AND_MESSAGE_TABLES];
