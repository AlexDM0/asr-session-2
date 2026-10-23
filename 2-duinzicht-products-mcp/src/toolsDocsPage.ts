import type { Tool } from "@modelcontextprotocol/server";
import type { ServerCatalogue } from "./serverCatalogue.ts";

interface JsonSchema {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  const?: unknown;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
}

// The tools page shows what the server announces to an assistant, so it always matches the registered tools.
export function renderToolsPage(catalogue: ServerCatalogue): string {
  const { instructions, tools } = catalogue;
  const toolNames = tools.map((tool) => tool.name);
  const toolLinks = tools.map((tool) => `<li><a href="#${escapeHtml(tool.name)}"><code>${escapeHtml(tool.name)}</code></a> ${escapeHtml(tool.title ?? "")}</li>`).join("");

  return `<h1>Tools</h1>
<p class="source">From the running server: the instructions and tool list your assistant receives when it connects.</p>
<ul>${toolLinks}</ul>
<h2 id="instructions">Server instructions</h2>
${renderInstructions(instructions, toolNames)}
${tools.map((tool, index) => renderTool(tool, index, tools.length, toolNames)).join("\n")}`;
}

function renderInstructions(instructions: string, toolNames: string[]): string {
  return instructions
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n");
      const numberedLines = lines.filter((line) => /^\d+\.\s/.test(line));
      if (numberedLines.length === 0) return `<p>${formatText(block, toolNames)}</p>`;

      const introduction = lines.filter((line) => !/^\d+\.\s/.test(line)).join(" ");
      const listItems = numberedLines.map((line) => `<li>${formatText(line.replace(/^\d+\.\s/, ""), toolNames)}</li>`).join("");
      return `${introduction ? `<p>${formatText(introduction, toolNames)}</p>` : ""}<ol class="tool-order">${listItems}</ol>`;
    })
    .join("\n");
}

function renderTool(tool: Tool, index: number, toolCount: number, toolNames: string[]): string {
  const inputSchema = tool.inputSchema as JsonSchema;
  const outputSchema = tool.outputSchema as JsonSchema | undefined;

  return `<h2 id="${escapeHtml(tool.name)}">${escapeHtml(tool.title ?? tool.name)} <code class="muted">${escapeHtml(tool.name)}</code></h2>
<p class="source">Tool ${index + 1} of ${toolCount}${renderAnnotationBadges(tool)}</p>
<p>${formatText(tool.description ?? "", toolNames)}</p>
<h3>Input</h3>
${renderInputTable(inputSchema, toolNames)}
<h3>Returns</h3>
${outputSchema ? renderOutputTable(outputSchema) : "<p>Text only, no structured output.</p>"}`;
}

function renderAnnotationBadges(tool: Tool): string {
  const annotations = tool.annotations ?? {};
  const badges = [
    annotations.readOnlyHint ? "Read-only" : "",
    annotations.idempotentHint ? "Idempotent" : "",
    annotations.openWorldHint === false ? "Local data only" : "",
  ].filter(Boolean);
  return badges.map((badge) => ` <span class="badge">${badge}</span>`).join("");
}

function renderInputTable(schema: JsonSchema, toolNames: string[]): string {
  const properties = Object.entries(schema.properties ?? {});
  if (properties.length === 0) return "<p>This tool takes no input.</p>";
  const requiredNames = new Set(schema.required ?? []);

  const rows = properties
    .map(([propertyName, propertySchema]) => {
      const requirement = requiredNames.has(propertyName) ? "required" : "optional";
      return `<tr><td><code>${escapeHtml(propertyName)}</code></td><td><code>${escapeHtml(describeSchemaType(propertySchema))}</code></td><td><span class="badge${requirement === "required" ? " yes" : ""}">${requirement}</span></td><td>${formatText(propertySchema.description ?? "", toolNames)}</td></tr>`;
    })
    .join("");

  return renderTable(["Field", "Type", "", "Meaning"], rows);
}

function renderOutputTable(schema: JsonSchema): string {
  const rows = Object.entries(schema.properties ?? {})
    .map(([propertyName, propertySchema]) => {
      const nestedFields = listNestedFieldNames(propertySchema.type === "array" ? propertySchema.items : propertySchema)
        .map((fieldName) => `<code>${escapeHtml(fieldName)}</code>`)
        .join(", ");
      return `<tr><td><code>${escapeHtml(propertyName)}</code></td><td><code>${escapeHtml(describeSchemaType(propertySchema))}</code></td><td>${nestedFields}</td></tr>`;
    })
    .join("");

  return renderTable(["Field", "Type", "Contains"], rows);
}

// A union of object shapes, such as the rating factor kinds, lists the fields of every shape once.
function listNestedFieldNames(schema: JsonSchema | undefined): string[] {
  if (!schema) return [];
  const shapes = schema.oneOf ?? schema.anyOf ?? [schema];
  return [...new Set(shapes.flatMap((shape) => Object.keys(shape.properties ?? {})))];
}

function renderTable(headings: string[], rows: string): string {
  return `<div class="scroll"><table>
<thead><tr>${headings.map((heading) => `<th>${heading}</th>`).join("")}</tr></thead>
<tbody>${rows}</tbody>
</table></div>`;
}

function describeSchemaType(schema: JsonSchema): string {
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  const unionMembers = schema.oneOf ?? schema.anyOf;
  if (unionMembers) return [...new Set(unionMembers.map(describeSchemaType))].join(" | ");
  if (Array.isArray(schema.type)) return schema.type.join(" | ");
  if (schema.type === "array") return `array of ${schema.items ? describeSchemaType(schema.items) : "items"}`;
  return schema.type ?? "any";
}

// Escapes the text, then turns tool names into links to their section.
function formatText(text: string, toolNames: string[]): string {
  const toolNamePattern = new RegExp(`\\b(${toolNames.join("|")})\\b`, "g");
  return escapeHtml(text).replace(toolNamePattern, '<a href="#$1"><code>$1</code></a>');
}

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
