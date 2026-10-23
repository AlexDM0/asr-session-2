import { docsPath, escapeHtml, euros, list } from "./docsPages.ts";
import type { PortalClaim, PortalPolicy, PortalSnapshot } from "./portalDatabase.ts";
import type { ProductRepository } from "./productRepository.ts";

// What the portal has stored, so the team can compare it with the catalogue. Read from the portal, not served by a tool.

export function renderPoliciesPage(repository: ProductRepository, snapshot: PortalSnapshot | { problem: string }): string {
  if ("problem" in snapshot) {
    return `<h1>Policies</h1>
<p class="source">${escapeHtml(snapshot.problem)}</p>`;
  }

  const source =
    snapshot.source === "database"
      ? `From the portal store <code>${escapeHtml(snapshot.path)}</code>, read when you opened this page. Reload to see what the portal has stored since.`
      : `The portal has not created its store yet, so this is its seed <code>${escapeHtml(snapshot.path)}</code>. Start the portal once and reload.`;
  const claimsPerPolicy = Map.groupBy(snapshot.claims, (claim) => claim.policyId);
  const customer = snapshot.customer
    ? `<div class="card">
<h3>Customer: ${escapeHtml(snapshot.customer.fullName)}</h3>
<div class="scroll"><table>
<tbody>
<tr><th>Customer number</th><td><code>${escapeHtml(snapshot.customer.customerNumber)}</code></td></tr>
<tr><th>Born</th><td>${escapeHtml(snapshot.customer.birthDate)}</td></tr>
<tr><th>Address</th><td>${escapeHtml(snapshot.customer.address)}</td></tr>
<tr><th>Email</th><td>${escapeHtml(snapshot.customer.emailAddress)}</td></tr>
<tr><th>Phone</th><td>${escapeHtml(snapshot.customer.phoneNumber)}</td></tr>
</tbody>
</table></div>
</div>`
    : '<p class="muted">No customer in the store.</p>';
  const policyRows = snapshot.policies
    .map(
      (policy) => `<tr>
  <td><a href="#${escapeHtml(policy.id)}">${escapeHtml(policy.name)}</a><br><code class="muted">${escapeHtml(policy.id)}</code></td>
  <td>${productLink(repository, policy.productCode)}</td>
  <td>${escapeHtml(policy.status)}</td>
  <td class="amount">${euros(policy.monthlyPremiumInEuros)}</td>
  <td class="amount">${claimsPerPolicy.get(policy.id)?.length ?? 0}</td>
</tr>`,
    )
    .join("");

  return `<h1>Policies</h1>
<p class="source">${source} No tool serves this data; it is here so you can see what is in the portal next to the catalogue.</p>
${customer}
<h2 id="overview">Policies</h2>
<div class="scroll"><table>
<thead><tr><th>Policy</th><th>Product</th><th>Status</th><th class="amount">Per month</th><th class="amount">Claims</th></tr></thead>
<tbody>${policyRows}</tbody>
</table></div>
${snapshot.policies.map((policy) => renderPolicy(repository, policy, claimsPerPolicy.get(policy.id) ?? [])).join("\n")}
${renderMessages(snapshot)}`;
}

function productLink(repository: ProductRepository, productCode: string): string {
  const product = repository.findProduct(productCode);
  return product
    ? `<a href="${docsPath}/products#${product.code}">${escapeHtml(product.name)}</a> <code class="muted">${escapeHtml(product.code)}</code>`
    : `<code>${escapeHtml(productCode)}</code> <span class="muted">not in the catalogue</span>`;
}

function renderPolicy(repository: ProductRepository, policy: PortalPolicy, claims: PortalClaim[]): string {
  const facts = policy.facts.map((fact) => `<tr><th>${escapeHtml(fact.label)}</th><td>${escapeHtml(fact.value)}</td></tr>`).join("");
  const product = repository.findProduct(policy.productCode);
  const premiumRules = product?.quotableOnline ? ` &middot; <a href="${docsPath}/premium-rules#${product.code}">Premium rules</a>` : "";
  return `<h2 id="${escapeHtml(policy.id)}">${escapeHtml(policy.name)} <code class="muted">${escapeHtml(policy.id)}</code></h2>
<p><strong>${escapeHtml(policy.subtitle)}</strong> <span class="badge">${escapeHtml(policy.status)}</span></p>
<p>Product: ${productLink(repository, policy.productCode)}${premiumRules}</p>
<div class="scroll"><table><tbody>${facts}</tbody></table></div>
<h3>Coverage on the policy</h3>
${policy.coverage.length > 0 ? list(policy.coverage) : '<p class="muted">None.</p>'}
<h3>Claims</h3>
${claims.length > 0 ? renderClaims(claims) : '<p class="muted">No claims on this policy.</p>'}`;
}

function renderClaims(claims: PortalClaim[]): string {
  const rows = claims
    .map(
      (claim) => `<tr>
  <td><strong>${escapeHtml(claim.title)}</strong><br><code class="muted">${escapeHtml(claim.id)}</code></td>
  <td>${escapeHtml(claim.reportedAt.replace("T", " "))}</td>
  <td><code>${escapeHtml(claim.category)}</code></td>
  <td><code>${escapeHtml(claim.status)}</code>${claim.currentStep ? `<br><span class="muted">${escapeHtml(claim.currentStep)}</span>` : ""}</td>
  <td>${claim.handlerName ? escapeHtml(claim.handlerName) : '<span class="muted">None yet</span>'}</td>
  <td class="amount">${claim.photoCount}</td>
</tr>`,
    )
    .join("");
  return `<div class="scroll"><table>
<thead><tr><th>Claim</th><th>Reported</th><th>Category</th><th>Status</th><th>Handler</th><th class="amount">Photos</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>`;
}

function renderMessages(snapshot: PortalSnapshot): string {
  if (snapshot.messages.length === 0) return '<h2 id="messages">Messages</h2>\n<p class="muted">No messages.</p>';
  const rows = snapshot.messages
    .map((message) => `<tr><td>${escapeHtml(message.title)}<br><code class="muted">${escapeHtml(message.id)}</code></td><td>${escapeHtml(message.sentOn)}</td><td>${message.isRead ? "Read" : "Unread"}</td></tr>`)
    .join("");
  return `<h2 id="messages">Messages</h2>
<div class="scroll"><table>
<thead><tr><th>Message</th><th>Sent</th><th></th></tr></thead>
<tbody>${rows}</tbody>
</table></div>`;
}
