import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderPoliciesPage } from "../src/policiesDocsPage.ts";
import { createPortalSnapshotReader } from "../src/portalDatabase.ts";
import { loadProductRepository, type ProductRepository } from "../src/productRepository.ts";
import { dataDirectory, missingPortalDatabasePath, portalSeedFixturePath } from "./support/testServer.ts";

let repository: ProductRepository;
let scratchDirectory: string;

beforeAll(async () => {
  repository = await loadProductRepository(dataDirectory);
  scratchDirectory = mkdtempSync(join(tmpdir(), "portal-store-"));
});

afterAll(() => {
  rmSync(scratchDirectory, { recursive: true, force: true });
});

// Only the columns the page reads; the portal's own migration has the full schema with its checks.
function createPortalStore(databasePath: string): void {
  const database = new Database(databasePath);
  database.run(`CREATE TABLE customer (customer_number TEXT, full_name TEXT, birth_date TEXT, email_address TEXT, phone_number TEXT, street_and_house_number TEXT, postcode TEXT, city TEXT)`);
  database.run(`CREATE TABLE policy (policy_id TEXT, position INTEGER, kind TEXT, name TEXT, subtitle TEXT, monthly_premium_cents INTEGER, status TEXT)`);
  database.run(`CREATE TABLE policy_fact (policy_id TEXT, position INTEGER, label TEXT, value TEXT)`);
  database.run(`CREATE TABLE policy_coverage_item (policy_id TEXT, position INTEGER, description TEXT)`);
  database.run(`CREATE TABLE claim (claim_id TEXT, policy_id TEXT, title TEXT, category TEXT, reported_at TEXT, status TEXT, handler_name TEXT)`);
  database.run(`CREATE TABLE claim_step (claim_id TEXT, position INTEGER, title TEXT, state TEXT)`);
  database.run(`CREATE TABLE claim_photo (photo_id TEXT, claim_id TEXT)`);
  database.run(`CREATE TABLE message (message_id TEXT, title TEXT, sent_on TEXT, is_read INTEGER)`);
  database.run(`INSERT INTO customer VALUES ('40218773', 'Sanne de Vries', '1988-06-14', 'sanne.devries@example.nl', '06 12 34 56 78', 'Lindelaan 12', '3521 AB', 'Utrecht')`);
  database.run(`INSERT INTO policy VALUES ('DZ-AU-902117', 1, 'car', 'Autoverzekering', 'Allrisk', 4160, 'active')`);
  database.run(`INSERT INTO policy_fact VALUES ('DZ-AU-902117', 1, 'Kenteken', 'GH-482-K')`);
  database.run(`INSERT INTO claim VALUES ('S-2026-0999', 'DZ-AU-902117', 'Deuk in portier', 'car', '2026-10-20T10:00', 'reported', NULL)`);
  database.run(`INSERT INTO claim_step VALUES ('S-2026-0999', 1, 'Schade gemeld', 'current')`);
  database.run(`INSERT INTO claim_photo VALUES ('P1', 'S-2026-0999'), ('P2', 'S-2026-0999')`);
  database.close();
}

describe("policies docs page", () => {
  test("shows the portal seed while the portal has no store yet", () => {
    const html = renderPoliciesPage(repository, createPortalSnapshotReader(missingPortalDatabasePath, portalSeedFixturePath)());
    expect(html).toContain("has not created its store yet");
    expect(html).toContain('id="DZ-WH-118204"');
    expect(html).toContain('href="/docs/products#woonhuis"');
    expect(html).toContain("S-2026-0418");
  });

  test("reads the live store and links each policy kind to its product", () => {
    const databasePath = join(scratchDirectory, "portal.sqlite");
    createPortalStore(databasePath);
    const html = renderPoliciesPage(repository, createPortalSnapshotReader(databasePath, portalSeedFixturePath)());
    expect(html).toContain("read when you opened this page");
    expect(html).toContain('href="/docs/products#auto"');
    expect(html).toContain("&euro;&nbsp;41.60");
    expect(html).toContain("Deuk in portier");
    expect(html).toContain("Schade gemeld");
    expect(html).not.toContain("DZ-WH-118204");
  });

  test("says what is missing when there is neither a store nor a seed", () => {
    const html = renderPoliciesPage(repository, createPortalSnapshotReader(missingPortalDatabasePath, join(scratchDirectory, "no-seed.json"))());
    expect(html).toContain("Is the portal folder next to this one?");
  });
});
