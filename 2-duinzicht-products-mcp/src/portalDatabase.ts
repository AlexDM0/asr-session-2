import { Database } from "bun:sqlite";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Reads what the portal next to this folder has stored, for the docs page only. No tool serves this data:
// the assistant learns about policies from the portal code, not from this server.

const portalDirectory = join(import.meta.dir, "..", "..", "1-mijn-duinzicht");
export const defaultPortalDatabasePath = join(portalDirectory, ".data", "portal.sqlite");
export const defaultPortalSeedPath = join(portalDirectory, "apps", "api", "resources", "seed.json");

// The portal stores a policy kind; the catalogue knows the product by its Dutch code.
const productCodeByPolicyKind: Record<string, string> = { home: "woonhuis", contents: "inboedel", car: "auto", liability: "aansprakelijkheid" };

export interface PortalCustomer {
  customerNumber: string;
  fullName: string;
  birthDate: string;
  address: string;
  emailAddress: string;
  phoneNumber: string;
}

export interface PortalPolicy {
  id: string;
  productCode: string;
  name: string;
  subtitle: string;
  monthlyPremiumInEuros: number;
  status: string;
  facts: { label: string; value: string }[];
  coverage: string[];
}

export interface PortalClaim {
  id: string;
  policyId: string;
  title: string;
  category: string;
  reportedAt: string;
  status: string;
  handlerName: string | null;
  currentStep: string | null;
  photoCount: number;
}

export interface PortalMessage {
  id: string;
  title: string;
  sentOn: string;
  isRead: boolean;
}

export interface PortalSnapshot {
  // "database" is the live store; "seed" means the portal has not created its store yet.
  source: "database" | "seed";
  path: string;
  customer: PortalCustomer | undefined;
  policies: PortalPolicy[];
  claims: PortalClaim[];
  messages: PortalMessage[];
}

export type PortalSnapshotReader = () => PortalSnapshot | { problem: string };

// Reads afresh on every call, so a reload of the page shows what the portal has stored since.
export function createPortalSnapshotReader(databasePath: string, seedPath: string): PortalSnapshotReader {
  return () => {
    try {
      if (existsSync(databasePath)) return readDatabase(databasePath);
      if (existsSync(seedPath)) return readSeed(seedPath);
      return { problem: `No portal store at ${databasePath} and no seed at ${seedPath}. Is the portal folder next to this one?` };
    } catch (error) {
      return { problem: `Could not read the portal data: ${error instanceof Error ? error.message : String(error)}` };
    }
  };
}

interface Row {
  [column: string]: string | number | null;
}

function readDatabase(databasePath: string): PortalSnapshot {
  const database = new Database(databasePath, { readonly: true });
  try {
    const all = (sql: string) => database.query<Row, []>(sql).all();
    const customerRow = all("SELECT * FROM customer LIMIT 1")[0];
    const facts = Map.groupBy(all("SELECT * FROM policy_fact ORDER BY policy_id, position"), (row) => String(row.policy_id));
    const coverage = Map.groupBy(all("SELECT * FROM policy_coverage_item ORDER BY policy_id, position"), (row) => String(row.policy_id));
    const currentSteps = new Map(all("SELECT claim_id, title FROM claim_step WHERE state = 'current'").map((row) => [String(row.claim_id), String(row.title)]));
    const photoCounts = new Map(all("SELECT claim_id, COUNT(*) AS photo_count FROM claim_photo GROUP BY claim_id").map((row) => [String(row.claim_id), Number(row.photo_count)]));

    return {
      source: "database",
      path: databasePath,
      customer: customerRow && {
        customerNumber: String(customerRow.customer_number),
        fullName: String(customerRow.full_name),
        birthDate: String(customerRow.birth_date),
        address: `${customerRow.street_and_house_number}, ${customerRow.postcode} ${customerRow.city}`,
        emailAddress: String(customerRow.email_address),
        phoneNumber: String(customerRow.phone_number),
      },
      policies: all("SELECT * FROM policy ORDER BY position").map((row) => {
        const id = String(row.policy_id);
        return {
          id,
          productCode: productCodeByPolicyKind[String(row.kind)] ?? String(row.kind),
          name: String(row.name),
          subtitle: String(row.subtitle),
          monthlyPremiumInEuros: Number(row.monthly_premium_cents) / 100,
          status: String(row.status),
          facts: (facts.get(id) ?? []).map((fact) => ({ label: String(fact.label), value: String(fact.value) })),
          coverage: (coverage.get(id) ?? []).map((item) => String(item.description)),
        };
      }),
      claims: all("SELECT * FROM claim ORDER BY reported_at DESC").map((row) => {
        const id = String(row.claim_id);
        return {
          id,
          policyId: String(row.policy_id),
          title: String(row.title),
          category: String(row.category),
          reportedAt: String(row.reported_at),
          status: String(row.status),
          handlerName: row.handler_name === null ? null : String(row.handler_name),
          currentStep: currentSteps.get(id) ?? null,
          photoCount: photoCounts.get(id) ?? 0,
        };
      }),
      messages: all("SELECT * FROM message ORDER BY sent_on DESC").map((row) => ({
        id: String(row.message_id),
        title: String(row.title),
        sentOn: String(row.sent_on),
        isRead: row.is_read === 1,
      })),
    };
  } finally {
    database.close();
  }
}

// The seed is the portal's own input format: Dutch values, and the policy type is already the product code.
interface Seed {
  customer: { customerNumber: string; fullName: string; birthDate: string; emailAddress: string; phoneNumber: string; address: { streetAndHouseNumber: string; postcode: string; city: string } };
  policies: { id: string; type: string; name: string; subtitle: string; monthlyPremiumEuros: string; status: string; facts: { label: string; value: string }[]; coverage: string[] }[];
  claims: { id: string; policyId: string; title: string; category: string; reportedAt: string; status: string; handlerName?: string | null; steps: { title: string; state: string }[] }[];
  messages: { id: string; title: string; sentOn: string; isRead: boolean }[];
}

function readSeed(seedPath: string): PortalSnapshot {
  const seed = JSON.parse(readFileSync(seedPath, "utf8")) as Seed;
  const { customer } = seed;
  return {
    source: "seed",
    path: seedPath,
    customer: {
      customerNumber: customer.customerNumber,
      fullName: customer.fullName,
      birthDate: customer.birthDate,
      address: `${customer.address.streetAndHouseNumber}, ${customer.address.postcode} ${customer.address.city}`,
      emailAddress: customer.emailAddress,
      phoneNumber: customer.phoneNumber,
    },
    policies: seed.policies.map((policy) => ({
      id: policy.id,
      productCode: policy.type,
      name: policy.name,
      subtitle: policy.subtitle,
      monthlyPremiumInEuros: Number(policy.monthlyPremiumEuros),
      status: policy.status,
      facts: policy.facts,
      coverage: policy.coverage,
    })),
    claims: seed.claims.map((claim) => ({
      id: claim.id,
      policyId: claim.policyId,
      title: claim.title,
      category: claim.category,
      reportedAt: claim.reportedAt,
      status: claim.status,
      handlerName: claim.handlerName ?? null,
      currentStep: claim.steps.find((step) => step.state === "current")?.title ?? null,
      photoCount: 0,
    })),
    messages: seed.messages.map((message) => ({ id: message.id, title: message.title, sentOn: message.sentOn, isRead: message.isRead })),
  };
}
