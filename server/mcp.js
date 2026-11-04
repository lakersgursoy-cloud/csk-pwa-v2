// Read-only MCP tools over the same public data as the REST API.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const text = value => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] });

export function createMcpServer(data) {
  const server = new McpServer({ name: 'cukurambar-mcp', version: '1.0.0' });
  const tool = (name, description, pick) => server.registerTool(name, { description, annotations: READ_ONLY }, async () => text(pick()));
  tool('get_club_profile', 'Kulübün adı, tescil tarihi, kurucusu, felsefesi ve resmî bağlantıları.', () => ({ club: data.club, links: data.links, reviewed: data.reviewed }));
  tool('list_programs', 'Yaş grupları ve eğitim programları. Ücret içermez.', () => data.programs);
  tool('list_locations', 'Derslerin yapıldığı kiralık veya ortak tesisler.', () => data.facilities);
  tool('get_published_schedule', 'Kulübün yayımladığı saatler. Kayıttan önce kulüpten teyit edilmelidir.', () => data.publishedSchedule);
  tool('list_projects', 'ÇSK Teknik Lab, kAnka ve Kayıp Medeniyet projeleri.', () => data.projects);
  return server;
}

// Stateless: every request gets its own server and transport, so nothing is kept between calls.
export async function handleMcp(req, res, body, data) {
  const server = createMcpServer(data);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}
