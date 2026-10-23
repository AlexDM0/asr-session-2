import type { Product, ProductPremiumRules, RatingFactor, WorkedExample } from "./catalogueSchemas.ts";
import type { PortalSnapshotReader } from "./portalDatabase.ts";
import { renderPoliciesPage } from "./policiesDocsPage.ts";
import type { ProductRepository } from "./productRepository.ts";
import type { ServerCatalogue } from "./serverCatalogue.ts";
import { renderToolsPage } from "./toolsDocsPage.ts";

// Readable HTML pages of the same data the tools serve, for the people in the team. Assistants use the tools.

export const docsPath = "/docs";

interface DocsPage {
  path: string;
  title: string;
  source: string;
  render(repository: ProductRepository, serverCatalogue: ServerCatalogue, readPortalSnapshot: PortalSnapshotReader): string;
}

const pages: DocsPage[] = [
  { path: `${docsPath}/products`, title: "Products", source: "<code>data/products.json</code>", render: renderProductsPage },
  { path: `${docsPath}/premium-rules`, title: "Premium rules", source: "<code>data/premium-rules.json</code>", render: renderPremiumRulesPage },
  { path: `${docsPath}/worked-examples`, title: "Worked examples", source: "<code>data/worked-examples.json</code>", render: renderWorkedExamplesPage },
  { path: `${docsPath}/tools`, title: "Tools", source: "the running server", render: (_repository, serverCatalogue) => renderToolsPage(serverCatalogue) },
  { path: `${docsPath}/policies`, title: "Policies", source: "the portal store, not served by any tool", render: (repository, _serverCatalogue, readPortalSnapshot) => renderPoliciesPage(repository, readPortalSnapshot()) },
];

// Returns the HTML of a docs page, or undefined when the path is not one.
export function renderDocsPage(
  pathname: string,
  repository: ProductRepository,
  serverCatalogue: ServerCatalogue,
  readPortalSnapshot: PortalSnapshotReader,
): string | undefined {
  const normalizedPath = pathname.replace(/\/+$/, "");
  if (normalizedPath === docsPath) return renderLayout("Docs", renderIndexPage(repository), repository);
  const page = pages.find((candidate) => candidate.path === normalizedPath);
  return page ? renderLayout(page.title, page.render(repository, serverCatalogue, readPortalSnapshot), repository) : undefined;
}

export function escapeHtml(text: string | number): string {
  return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function euros(amount: number): string {
  return `&euro;&nbsp;${amount.toFixed(2)}`;
}

// Intermediate amounts keep every decimal, exactly as the data has them.
function exactEuros(amount: number): string {
  return `&euro;&nbsp;${escapeHtml(amount)}`;
}

export function list(items: string[]): string {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function rulesAnchor(productCode: string): string {
  return `${docsPath}/premium-rules#${productCode}`;
}

function renderLayout(title: string, body: string, repository: ProductRepository): string {
  const navigation = [{ path: docsPath, title: "Docs" }, ...pages]
    .map((page) => `<a href="${page.path}"${page.title === title ? ' aria-current="page"' : ""}>${escapeHtml(page.title)}</a>`)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} - ${escapeHtml(repository.insurer)}</title>
<style>
  :root { color-scheme: light dark; --text: #000b3b; --muted: #4a5170; --background: #fffbf5; --surface: #ffffff; --line: #e3ddd3; --accent: #eb5328; }
  @media (prefers-color-scheme: dark) {
    :root { --text: #f2efe9; --muted: #b5b8c8; --background: #000b3b; --surface: #0b1650; --line: #26306a; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.55 "Avenir Next", Avenir, "Segoe UI", system-ui, sans-serif; color: var(--text); background: var(--background); }
  header { border-bottom: 3px solid var(--accent); background: var(--surface); }
  header div, main { max-width: 960px; margin: 0 auto; padding: 0 16px; }
  header div { display: flex; flex-wrap: wrap; gap: 4px 20px; align-items: baseline; padding-top: 14px; padding-bottom: 12px; }
  header strong { margin-right: auto; }
  nav { display: flex; flex-wrap: wrap; gap: 4px 16px; }
  a { color: inherit; text-decoration-color: var(--accent); text-underline-offset: 3px; }
  nav a[aria-current="page"] { color: var(--accent); font-weight: 600; text-decoration: none; }
  main { padding-top: 8px; padding-bottom: 64px; }
  h1 { font-size: 2rem; margin: 24px 0 8px; }
  h2 { font-size: 1.4rem; margin: 40px 0 8px; padding-top: 8px; border-top: 1px solid var(--line); }
  h3 { font-size: 1.1rem; margin: 24px 0 6px; }
  .muted, .source { color: var(--muted); }
  .source { font-size: 0.875rem; }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 4px 16px 12px; margin: 16px 0; }
  .badge { display: inline-block; font-size: 0.8rem; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--line); vertical-align: middle; }
  .badge.yes { border-color: var(--accent); color: var(--accent); }
  .scroll { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 16px; font-size: 0.95rem; }
  th, td { text-align: left; vertical-align: top; padding: 6px 10px; border-bottom: 1px solid var(--line); }
  th { font-weight: 600; }
  td.amount, th.amount { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.9em; }
  .tool-order li::marker { color: var(--accent); font-weight: 600; }
</style>
</head>
<body>
<header><div><strong>${escapeHtml(repository.insurer)}</strong><nav>${navigation}</nav></div></header>
<main>
${body}
</main>
</body>
</html>
`;
}

function renderIndexPage(repository: ProductRepository): string {
  const pageLinks = pages
    .map((page) => `<li><a href="${page.path}">${escapeHtml(page.title)}</a> <span class="source">from ${page.source}</span></li>`)
    .join("");
  const productRows = repository
    .listProducts()
    .map(
      (product) => `<tr>
  <td><a href="${docsPath}/products#${product.code}">${escapeHtml(product.name)}</a></td>
  <td><code>${escapeHtml(product.code)}</code></td>
  <td>${product.quotableOnline ? `<a href="${rulesAnchor(product.code)}">Premium rules</a>` : '<span class="muted">Adviser only</span>'}</td>
</tr>`,
    )
    .join("");
  return `<h1>Products and premium rules</h1>
<p>A readable version of the data this MCP server serves to your assistant through its tools. Same data, nothing extra. The one exception is <a href="${docsPath}/policies">Policies</a>: what the portal next to this folder has in its store, so you can see which customer, policies and claims your assistant works with.</p>
<ul>${pageLinks}</ul>
<h2>Products</h2>
<div class="scroll"><table>
<thead><tr><th>Product</th><th>Code</th><th>Quotable online</th></tr></thead>
<tbody>${productRows}</tbody>
</table></div>`;
}

function renderProductsPage(repository: ProductRepository): string {
  return `<h1>Products</h1>
<p class="source">From <code>data/products.json</code>. The tools <code>list_products</code> and <code>get_product</code> serve the same data.</p>
${repository.listProducts().map(renderProduct).join("\n")}`;
}

function renderProduct(product: Product): string {
  const quotable = product.quotableOnline
    ? `<p><span class="badge yes">Quotable online</span> <a href="${rulesAnchor(product.code)}">Premium rules</a></p>`
    : `<p><span class="badge">Adviser only</span> ${escapeHtml(product.notQuotableReason)}</p>`;
  const conditions = product.quotableOnline
    ? `<h3>Conditions</h3>
<p><strong>Start of cover.</strong> ${escapeHtml(product.conditions.coverageStart)}</p>
<p><strong>Waiting period.</strong> ${escapeHtml(product.conditions.waitingPeriod)}</p>
<p><strong>Acceptance</strong></p>
${list(product.conditions.acceptance)}`
    : "";
  return `<h2 id="${product.code}">${escapeHtml(product.name)} <code class="muted">${escapeHtml(product.code)}</code></h2>
<p><strong>${escapeHtml(product.summary)}</strong></p>
<p>${escapeHtml(product.description)}</p>
${quotable}
<h3>Cover</h3>
${list(product.cover)}
<h3>Exclusions</h3>
${product.exclusions.length > 0 ? list(product.exclusions) : '<p class="muted">None.</p>'}
${conditions}`;
}

function renderPremiumRulesPage(repository: ProductRepository): string {
  const general = repository.getGeneralRules();
  const steps = general.calculationSteps
    .map((step) => `<tr><td>${step.order}</td><td><strong>${escapeHtml(step.name)}</strong><br><code class="muted">${escapeHtml(step.code)}</code></td><td>${escapeHtml(step.rule)}</td></tr>`)
    .join("");
  const productLinks = repository
    .listQuotableProductCodes()
    .map((code) => `<a href="#${code}">${escapeHtml(repository.findProduct(code)?.name ?? code)}</a>`)
    .join(" &middot; ");
  const productSections = repository
    .listQuotableProductCodes()
    .flatMap((code) => {
      const rules = repository.findPremiumRules(code);
      return rules ? [renderProductRules(rules, repository.findProduct(code)?.name ?? code)] : [];
    })
    .join("\n");

  return `<h1>Premium rules</h1>
<p class="source">From <code>data/premium-rules.json</code>. The tools <code>get_premium_rules</code>, <code>get_discount_rules</code> and <code>explain_premium_calculation</code> serve the same data.</p>
<p>All premiums are per ${escapeHtml(general.premiumPeriod)}, in ${escapeHtml(general.currency)}. Per product: ${productLinks}</p>

<h2 id="calculation-steps">Order of calculation</h2>
<div class="scroll"><table>
<thead><tr><th>Step</th><th>Name</th><th>Rule</th></tr></thead>
<tbody>${steps}</tbody>
</table></div>
<h3>Why the order matters</h3>
${list(general.orderNotes)}

<h2 id="package-discount">${escapeHtml(general.packageDiscount.name)}: ${general.packageDiscount.discountPercentage}%</h2>
<p>${escapeHtml(general.packageDiscount.rule)}</p>
<p><strong>What counts</strong></p>
${list(general.packageDiscount.whatCounts)}
<p><strong>Applies to.</strong> ${escapeHtml(general.packageDiscount.appliesTo)}</p>

<h2 id="minimum-tax-rounding">Minimum premium, insurance tax and rounding</h2>
<div class="scroll"><table>
<tbody>
<tr><th>Minimum monthly premium before tax</th><td>${euros(general.minimumMonthlyPremiumBeforeTaxInEuros)}</td></tr>
<tr><th>Insurance tax</th><td>${general.insuranceTaxPercentage}%</td></tr>
<tr><th>Rounding</th><td>${general.rounding.decimals} decimals, ${escapeHtml(general.rounding.method)}. ${escapeHtml(general.rounding.rule)}</td></tr>
</tbody>
</table></div>

${productSections}`;
}

function renderProductRules(rules: ProductPremiumRules, productName: string): string {
  const modules = rules.modules
    .map((module) => `<tr><td><strong>${escapeHtml(module.name)}</strong><br><code class="muted">${escapeHtml(module.code)}</code></td><td>${escapeHtml(module.description)}</td><td class="amount">${euros(module.monthlyPriceInEuros)}</td></tr>`)
    .join("");
  const deductibles = rules.deductibles
    .map((deductible) => `<tr><td class="amount">${euros(deductible.amountInEuros)}</td><td class="amount">${deductible.discountPercentage}%</td><td>${deductible.isDefault ? "Default" : ""}</td></tr>`)
    .join("");
  return `<h2 id="${rules.productCode}">${escapeHtml(productName)} <code class="muted">${escapeHtml(rules.productCode)}</code></h2>
<p>Base monthly premium: <strong>${euros(rules.baseMonthlyPremiumInEuros)}</strong>.
<a href="${docsPath}/products#${rules.productCode}">Product</a> &middot; <a href="${docsPath}/worked-examples#${rules.productCode}">Worked examples</a></p>
<h3>Rating factors</h3>
${rules.ratingFactors.map(renderRatingFactor).join("\n")}
<h3>Modules</h3>
<p class="muted">Fixed monthly prices, added after the rating factors and never multiplied by them.</p>
<div class="scroll"><table>
<thead><tr><th>Module</th><th>Description</th><th class="amount">Per month</th></tr></thead>
<tbody>${modules}</tbody>
</table></div>
<h3>Deductibles</h3>
<p>${escapeHtml(rules.deductibleAppliesTo)}</p>
<div class="scroll"><table>
<thead><tr><th class="amount">Deductible</th><th class="amount">Discount</th><th></th></tr></thead>
<tbody>${deductibles}</tbody>
</table></div>`;
}

function renderRatingFactor(factor: RatingFactor): string {
  let header: string;
  let rows: string;
  switch (factor.kind) {
    case "choice":
      header = "<th>Option</th><th>Code</th>";
      rows = factor.options.map((option) => `<tr><td>${escapeHtml(option.label)}</td><td><code>${escapeHtml(option.code)}</code></td><td class="amount">&times;&nbsp;${option.multiplier}</td></tr>`).join("");
      break;
    case "band":
      header = `<th>Band</th><th class="amount">Up to and including (${escapeHtml(factor.unit)})</th>`;
      rows = factor.options
        .map((option) => `<tr><td>${escapeHtml(option.label)}<br><code class="muted">${escapeHtml(option.code)}</code></td><td class="amount">${option.upToAndIncluding}</td><td class="amount">&times;&nbsp;${option.multiplier}</td></tr>`)
        .join("");
      break;
    case "postcode-area":
      header = "<th>Zone</th><th>Postcode areas</th>";
      rows = factor.options
        .map((option) => {
          const areas = option.code === factor.defaultOptionCode ? "Every area not listed in another zone" : option.postcodeAreas.join(", ");
          return `<tr><td>${escapeHtml(option.label)}<br><code class="muted">${escapeHtml(option.code)}</code></td><td>${escapeHtml(areas)}</td><td class="amount">&times;&nbsp;${option.multiplier}</td></tr>`;
        })
        .join("");
      break;
  }
  return `<p><strong>${escapeHtml(factor.name)}</strong> <code class="muted">${escapeHtml(factor.code)}</code><br>${escapeHtml(factor.description)}</p>
<div class="scroll"><table>
<thead><tr>${header}<th class="amount">Multiplier</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>`;
}

function renderWorkedExamplesPage(repository: ProductRepository): string {
  const customer = repository.getWorkedExampleCustomer();
  const examplesPerProduct = repository
    .listQuotableProductCodes()
    .map((code) => {
      const examples = repository.listWorkedExamples().filter((example) => example.productCode === code);
      return `<h2 id="${code}">${escapeHtml(repository.findProduct(code)?.name ?? code)} <code class="muted">${escapeHtml(code)}</code></h2>
<p><a href="${rulesAnchor(code)}">Premium rules for this product</a></p>
${examples.length > 0 ? examples.map(renderWorkedExample).join("\n") : '<p class="muted">No worked examples.</p>'}`;
    })
    .join("\n");

  return `<h1>Worked examples</h1>
<p class="source">From <code>data/worked-examples.json</code>. The tool <code>explain_premium_calculation</code> serves the same data.</p>
<div class="card">
<h3>The worked-example customer: ${escapeHtml(customer.name)}</h3>
<div class="scroll"><table>
<tbody>
<tr><th>Born</th><td>${escapeHtml(customer.birthDate)}</td></tr>
<tr><th>Address</th><td>${escapeHtml(customer.address.streetAndHouseNumber)}, ${escapeHtml(customer.address.postcode)} ${escapeHtml(customer.address.city)}</td></tr>
<tr><th>Household</th><td><code>${escapeHtml(customer.household)}</code></td></tr>
<tr><th>Housing situation</th><td><code>${escapeHtml(customer.housingSituation)}</code></td></tr>
<tr><th>Active policies</th><td>${customer.activePolicies.map((code) => `<a href="${docsPath}/products#${code}"><code>${escapeHtml(code)}</code></a>`).join(", ")}</td></tr>
</tbody>
</table></div>
<p>${escapeHtml(customer.notes)}</p>
</div>
${examplesPerProduct}`;
}

function renderWorkedExample(example: WorkedExample): string {
  const choices = example.factorChoices
    .map((choice) => `<tr><td><code>${escapeHtml(choice.factorCode)}</code></td><td>${escapeHtml(choice.input)}</td><td><code>${escapeHtml(choice.optionCode)}</code></td><td class="amount">&times;&nbsp;${choice.multiplier}</td></tr>`)
    .join("");
  const steps = example.steps
    .map((step) => `<tr><td>${step.order}</td><td><code>${escapeHtml(step.code)}</code></td><td>${escapeHtml(step.calculation)}</td><td class="amount">${exactEuros(step.amountInEuros)}</td></tr>`)
    .join("");
  const modules = example.moduleCodes.length > 0 ? example.moduleCodes.map((code) => `<code>${escapeHtml(code)}</code>`).join(", ") : "none";
  return `<div class="card">
<h3>${escapeHtml(example.title)}</h3>
<p>${example.forWorkedExampleCustomer ? '<span class="badge yes">For the worked-example customer</span>' : '<span class="badge">Another customer</span>'}</p>
<p><strong>What it checks.</strong> ${escapeHtml(example.whatItChecks)}</p>
<p>Modules: ${modules}. Deductible: ${euros(example.deductibleInEuros)}. Active Duinzicht policies: ${example.activeDuinzichtPolicies}.</p>
<div class="scroll"><table>
<thead><tr><th>Rating factor</th><th>Input</th><th>Option</th><th class="amount">Multiplier</th></tr></thead>
<tbody>${choices}</tbody>
</table></div>
<div class="scroll"><table>
<thead><tr><th>Step</th><th>Code</th><th>Calculation</th><th class="amount">Amount</th></tr></thead>
<tbody>${steps}</tbody>
</table></div>
<p>Monthly premium: <strong>${euros(example.monthlyPremiumInEuros)}</strong></p>
</div>`;
}
