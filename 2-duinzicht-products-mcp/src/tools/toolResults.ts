import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/server";
import type { ProductRepository } from "../productRepository.ts";

export const readOnlyToolAnnotations: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export function jsonToolResult(output: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
    structuredContent: output,
  };
}

export function toolErrorResult(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

export function notQuotableProductErrorResult(productCode: string, repository: ProductRepository): CallToolResult {
  const quotableProductCodes = repository.listQuotableProductCodes().join(", ");
  const product = repository.findProduct(productCode);
  if (!product) return toolErrorResult(`Unknown product code "${productCode}". Products that can be quoted online: ${quotableProductCodes}.`);
  return toolErrorResult(
    `${product.name} ("${product.code}") cannot be quoted online, so there are no premium rules for it. Do not invent a premium; refer the customer to an adviser. Products that can be quoted online: ${quotableProductCodes}.`,
  );
}

export function logToolCall(toolName: string, toolArguments: Record<string, unknown> = {}): void {
  console.error(`Tool call: ${toolName} ${JSON.stringify(toolArguments)}`);
}
