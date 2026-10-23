# Duinzicht products MCP server

A read-only [Model Context Protocol](https://modelcontextprotocol.io) server with the product catalogue and premium rules of Duinzicht Verzekeringen. It tells an AI assistant which products Duinzicht sells, what they cover, how a monthly premium is calculated and which discounts apply. It serves rules; it does not calculate premiums for customers and it does not change anything.

It runs locally on your machine at `http://localhost:3333/mcp` (Streamable HTTP) and accepts connections from your own machine only.

Doing the workshop? Open [`workshop-steps.html`](workshop-steps.html) in a browser: the sprint step by step, with copy buttons and a checklist.

## Run it

This folder sits next to the portal folder in the session 2 repository, never inside it. Copilot must get the rules only through the MCP server, not by reading the JSON files.

### After the root setup

The setup in the repository root installs Bun and the dependencies of this folder. Run `bun run dev` here and leave the window open while you use the server. When it runs, you see:

```text
Loaded 7 products from .../2-duinzicht-products-mcp/data
MCP server "duinzicht-products" is running at http://localhost:3333/mcp
Readable docs for people: http://localhost:3333/docs
```

### Yourself

You need [Bun](https://bun.sh) 1.4.2 or newer.

```sh
bun install
bun run dev
```

| Script | What it does |
| --- | --- |
| `bun run dev` | Starts the server and restarts it when a source file changes |
| `bun run start` | Starts the server once |
| `bun run test` | Runs the tests |
| `bun run typecheck` | Checks the types with TypeScript |

There is no build step: Bun runs the TypeScript directly. The startup messages go to stdout, logs go to stderr; every tool call is logged, also one with a wrong product code, so you can watch what your assistant asks.

Stop the server with Ctrl+C.

## Connect it to GitHub Copilot

Add a file `.mcp.json` to the root of the project folder you open in VS Code or Copilot CLI:

```json
{
  "mcpServers": {
    "duinzicht-products": {
      "type": "http",
      "url": "http://localhost:3333/mcp",
      "tools": ["*"]
    }
  }
}
```

Then:

1. Make sure the server is running.
2. **Trust the folder.** Workspace MCP servers only load in a trusted folder. In VS Code, answer "Yes, I trust the authors" or run **Workspaces: Manage Workspace Trust**. Copilot CLI asks whether you trust the folder when you start it there.
3. **VS Code:** open `.mcp.json` and start the server from the action above its entry, or run **MCP: List Servers**, pick `duinzicht-products` and choose **Start**. In the chat view, open **Configure Tools** and check that the five tools below are listed and switched on.
4. **Copilot CLI:** run `copilot mcp list` in the folder; `duinzicht-products` shows up under the workspace servers.

Use `.mcp.json`, not `.vscode/mcp.json`: VS Code marks the latter as deprecated and Copilot CLI does not read it.

If the server does not show up, your organisation may have switched off the "MCP servers in Copilot" policy. Ask your GitHub administrator.

## Tools

Every tool is read-only and returns JSON, both as text and as structured content with an output schema.

| Tool | Input | Returns |
| --- | --- | --- |
| `list_products` | none | Every product with its code, Dutch name, category, summary and whether it can be quoted online |
| `get_product` | `productCode` | Description, cover and exclusions of one product, and for a product that can be quoted online its conditions (start of cover, waiting period, acceptance) |
| `get_premium_rules` | `productCode` of a product that can be quoted online | Base premium, rating factors, modules, deductibles, and the general rules: order of calculation, package discount, minimum premium, insurance tax, rounding |
| `get_discount_rules` | optional `productCode` | The package discount with exactly which policies count, the deductible discounts per product, and the minimum premium |
| `explain_premium_calculation` | optional `productCode` | The calculation steps in order, why the order matters, and worked examples with every intermediate amount |

A wrong or unknown product code gets an error that names the valid codes; a product that cannot be quoted online gets an error that says to refer the customer to an adviser.

The server also sends `instructions` to the client: what the domain is, that these tools are the only source of the rules, and the order in which to use the tools.

### Products

| Code | Name | Quotable online |
| --- | --- | --- |
| `woonhuis` | Woonhuisverzekering | no |
| `inboedel` | Inboedelverzekering | no |
| `auto` | Autoverzekering | no |
| `aansprakelijkheid` | Aansprakelijkheidsverzekering | no |
| `reis` | Doorlopende reisverzekering | yes |
| `rechtsbijstand` | Rechtsbijstandverzekering | yes |
| `fiets` | Fietsverzekering | yes |

## Read the rules yourself

Open [http://localhost:3333/docs](http://localhost:3333/docs) in a browser while the server runs. It shows the same data as the tools, as readable pages you can click through: products, premium rules (per product) and worked examples. The Tools page shows what your assistant receives when it connects: the server instructions and every tool with its input and output. Use it as a team to check what your assistant says; your assistant gets the rules through the tools.

The Policies page at [http://localhost:3333/docs/policies](http://localhost:3333/docs/policies) shows what the portal in `../1-mijn-duinzicht` has in its store: the customer, the policies with their claims, and the messages, each policy linked to its product. It reads the store afresh on every reload, and shows the portal seed until the portal has created its store. No tool serves this data.

## Try it without an assistant

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) needs Node.js 22.19 or later. With the server running:

```sh
# list the tools
npx @modelcontextprotocol/inspector@2.8.0 --cli --server-url http://localhost:3333/mcp --method tools/list

# call one tool
npx @modelcontextprotocol/inspector@2.8.0 --cli --server-url http://localhost:3333/mcp --method tools/call --tool-name get_premium_rules --tool-arg productCode=reis

# or open the web interface and connect to http://localhost:3333/mcp with transport "Streamable HTTP"
npx @modelcontextprotocol/inspector@2.8.0
```

Or with curl. A request must accept both JSON and an event stream:

```sh
curl -X POST http://localhost:3333/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_products","arguments":{}}}'
```

## Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3333` | Port the server listens on, on `127.0.0.1` and `::1` |
| `PRODUCTS_DATA_DIRECTORY` | `data` in this folder | Folder with the three JSON files below |
| `PORTAL_DATABASE_PATH` | `../1-mijn-duinzicht/.data/portal.sqlite` | The portal store the Policies page reads; set it to the same file as the portal's `DUINZICHT_DATABASE_PATH` if you changed that |

Example: `PORT=4444 bun run dev` (PowerShell: `$env:PORT=4444; bun run dev`). Remember to change the URL in `.mcp.json` too.

## Data

The catalogue and rules live in `data/`:

| File | Contents |
| --- | --- |
| `products.json` | The products, their cover and conditions |
| `premium-rules.json` | The order of calculation, the general rules and the rating rules per product |
| `worked-examples.json` | Worked examples: a quote for the customer Sanne de Vries per product that can be quoted online, plus edge cases (no package discount, the minimum premium, a premium that ends on half a cent) |

The files are loaded and validated at startup (`src/catalogueSchemas.ts` and `src/productRepository.ts`). A broken file stops the server with a message that names the file and the field, for example:

```text
The product store file premium-rules.json is not valid:
  - productRules[0].baseMonthlyPremiumInEuros: Invalid input: expected number, received string
```

The tests check that every worked example matches what the rules produce.

## Security

- The server only listens on the loopback addresses `127.0.0.1` and `::1`, and refuses requests whose `Host` header, or `Origin` header when there is one, is not `localhost`, `127.0.0.1` or `[::1]`.
- Every tool only reads. There is nothing to write, no customer data and no authentication.

## Project layout

```text
data/                     the JSON store
src/main.ts               entry point: reads the environment, loads the store, starts the server
src/httpServer.ts         Bun HTTP server on both loopback addresses, Host and Origin checks
src/duinzichtProductsServer.ts   the MCP server, its instructions and its tools
src/tools/                one file per tool
src/productRepository.ts  loads, validates and queries the store
src/catalogueSchemas.ts   zod schemas for the JSON files
tests/                    bun test: the store, the tools over HTTP, the worked examples
```

Built with the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) (`@modelcontextprotocol/server` 2.1.0) and zod 4.
