import { AIDiagramResponse, AIDiagramNode, PlanoElement, TechnicalCategory } from "./types";
import { tr } from "@/i18n/translate";

export interface GenerateDiagramOptions {
  prompt: string;
  kind: "c4" | "erd" | "uml" | "bpmn" | "flowchart" | "twoffactor";
  ollamaUrl?: string;
  model?: string;
}

export async function testOllamaConnection(url = "http://localhost:11434"): Promise<{ ok: boolean; models: string[]; message: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${url}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      return { ok: false, models: [], message: tr("Ollama respondió con código {status}", { status: res.status }) };
    }
    const data = (await res.json()) as { models?: { name: string }[] };
    const models = Array.isArray(data.models) ? data.models.map((m: { name: string }) => m.name) : [];
    return { ok: true, models, message: tr("Conexión exitosa con Ollama ({count} modelos disponibles)", { count: models.length }) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "No se pudo conectar a localhost:11434";
    return {
      ok: false,
      models: [],
      message: tr("Ollama no detectado en {url}. Se usará el motor de plantillas heurísticas inteligentes locales. ({error})", { url, error: msg }),
    };
  }
}

export async function generateDiagramWithAI(options: GenerateDiagramOptions): Promise<AIDiagramResponse> {
  const { prompt, kind, ollamaUrl = "http://localhost:11434", model = "llama3.1:8b" } = options;

  // Try live Ollama if available
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const systemPrompt = `Eres un arquitecto de software experto en diagramas técnicos (${kind}).
Devuelve ÚNICAMENTE un objeto JSON válido sin formato markdown ni texto extra, con esta estructura:
{
  "kind": "${kind}",
  "title": "Título conciso",
  "nodes": [
    {"id": "n1", "label": "Nombre del Componente", "description": "Detalle técnico breve"}
  ],
  "edges": [
    {"from": "n1", "to": "n2", "label": "Acción o protocolo"}
  ]
}`;

    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt: `${systemPrompt}\nRequerimiento del usuario: ${prompt}`,
        stream: false,
        format: "json",
      }),
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as { response?: string };
      if (data.response) {
        const parsed = JSON.parse(data.response);
        if (parsed.nodes && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
          return {
            kind,
            title: parsed.title || `Diagrama ${kind.toUpperCase()} Asistido`,
            nodes: parsed.nodes,
            edges: parsed.edges || [],
          };
        }
      }
    }
  } catch {
    // Fallback to internal heuristic blueprint generator
  }

  // Built-in intelligent template generator
  return getFallbackDiagram(prompt, kind);
}

function getFallbackDiagram(prompt: string, kind: string): AIDiagramResponse {
  const cleanPrompt = prompt.toLowerCase();

  if (kind === "c4" || cleanPrompt.includes("c4") || cleanPrompt.includes("arquitectura") || cleanPrompt.includes("enclave")) {
    return {
      kind: "c4",
      title: "Arquitectura C4 // Twoffactor Enclave Bicéfalo",
      nodes: [
        { id: "c4-user", label: "👤 Usuario Corporativo", description: "Inicia sesión con credenciales y reto" },
        { id: "c4-proxy", label: "⚡ Gateway Proxy mTLS", description: "Terminación TLS y balanceo hacia nodos activos" },
        { id: "c4-bicefalo", label: "🤖 Enclave Bicéfalo 2FA", description: "Hardware HSM FIPS 140-3 Nivel 4 (Bogotá + Miami)" },
        { id: "c4-ledger", label: "🗄️ Bóveda Inmutable", description: "Almacén criptográfico con retención cero" },
      ],
      edges: [
        { from: "c4-user", to: "c4-proxy", label: "1. POST /auth/challenge" },
        { from: "c4-proxy", to: "c4-bicefalo", label: "2. mTLS túnel cifrado" },
        { from: "c4-bicefalo", to: "c4-ledger", label: "3. Firma con doble llave" },
      ],
    };
  }

  if (kind === "erd" || cleanPrompt.includes("erd") || cleanPrompt.includes("base de datos") || cleanPrompt.includes("tabla")) {
    return {
      kind: "erd",
      title: "Modelo ERD // Directorio Criptográfico Twoffactor",
      nodes: [
        { id: "erd-org", label: "🏢 TABLE: organizations\n🔑 id: UUID\n● name: VARCHAR\n● plan: VARCHAR", description: "Empresas clientes" },
        { id: "erd-key", label: "🔑 TABLE: vault_keys\n🔑 id: UUID\n🔗 org_id: UUID\n● token_hash: CHAR(64)\n● stage: INT", description: "Credenciales activas" },
        { id: "erd-log", label: "📋 TABLE: audit_ledger\n🔑 id: UUID\n🔗 key_id: UUID\n● latency_ms: NUMERIC\n● status: VARCHAR", description: "Eventos 2FA" },
      ],
      edges: [
        { from: "erd-org", to: "erd-key", label: "1:N (Tiene llaves)" },
        { from: "erd-key", to: "erd-log", label: "1:N (Genera auditorías)" },
      ],
    };
  }

  if (kind === "bpmn" || cleanPrompt.includes("bpmn") || cleanPrompt.includes("flujo") || cleanPrompt.includes("proceso")) {
    return {
      kind: "bpmn",
      title: "Flujo BPMN // Verificación Transaccional Bicéfala",
      nodes: [
        { id: "bpmn-s", label: "▶ Inicio", description: "Solicitud de token recibida" },
        { id: "bpmn-t1", label: "⚙ Computar Hash", description: "Algoritmo bicéfalo en <3ms" },
        { id: "bpmn-g", label: "✕ ¿Consenso FT+JPH?", description: "Compuerta de validación de doble firma" },
        { id: "bpmn-e", label: "⏹ Fin Aprobado", description: "Token efímero retornado al cliente" },
      ],
      edges: [
        { from: "bpmn-s", to: "bpmn-t1", label: "Dispara cálculo" },
        { from: "bpmn-t1", to: "bpmn-g", label: "Envía a validación" },
        { from: "bpmn-g", to: "bpmn-e", label: "Si [Firma Correcta]" },
      ],
    };
  }

  if (kind === "uml" || cleanPrompt.includes("uml") || cleanPrompt.includes("clase")) {
    return {
      kind: "uml",
      title: "Diagrama de Clases UML // Core Twoffactor",
      nodes: [
        { id: "uml-1", label: "«Interface»\nITokenValidator\n─────────────\n+ verify(token): bool", description: "Contrato público" },
        { id: "uml-2", label: "BicefaloCluster\n─────────────\n- nodeMiami: Node\n- nodeBogota: Node\n─────────────\n+ executeConsensus()", description: "Motor de consenso" },
        { id: "uml-3", label: "ClientSession\n─────────────\n- clientId: string\n- slaLevel: string\n─────────────\n+ getRemainingQuota()", description: "Sesión activa" },
      ],
      edges: [
        { from: "uml-2", to: "uml-1", label: "Implementa" },
        { from: "uml-3", to: "uml-2", label: "Solicita firma" },
      ],
    };
  }

  // Default flowchart
  return {
    kind: "twoffactor",
    title: "Plano de Seguridad // Red de Nodos Twoffactor",
    nodes: [
      { id: "f-1", label: "🇨🇴 Nodo Primario Bogotá", description: "99.999% SLA (1.8ms latencia)" },
      { id: "f-2", label: "🤖 Enclave Bicéfalo HSM", description: "Aislamiento por Hardware FIPS 140-3" },
      { id: "f-3", label: "🇺🇸 Nodo Secundario Miami", description: "Failover automático en 3.6ms" },
    ],
    edges: [
      { from: "f-1", to: "f-2", label: "Túnel mTLS Primario" },
      { from: "f-2", to: "f-3", label: "Réplica continua de estado" },
    ],
  };
}

export function convertAIDiagramToElements(diagram: AIDiagramResponse, startX = 100, startY = 100): PlanoElement[] {
  const elements: PlanoElement[] = [];
  const nodePositions: Record<string, { x: number; y: number; width: number; height: number }> = {};

  const colSpacing = 280;
  const rowSpacing = 160;
  const maxPerRow = 3;

  diagram.nodes.forEach((node, index) => {
    const col = index % maxPerRow;
    const row = Math.floor(index / maxPerRow);

    const x = startX + col * colSpacing;
    const y = startY + row * rowSpacing;
    const width = 210;
    const height = 90;

    nodePositions[node.id] = { x, y, width, height };

    let strokeColor = "#22c55e";
    let bgColor = "#0A1810";

    if (diagram.kind === "c4") {
      strokeColor = index === 0 ? "#22D3EE" : index === 1 ? "#E5A93C" : "#22c55e";
      bgColor = "#081520";
    } else if (diagram.kind === "erd") {
      strokeColor = "#B87333";
      bgColor = "#14100B";
    } else if (diagram.kind === "bpmn") {
      strokeColor = index === 0 ? "#22c55e" : index === diagram.nodes.length - 1 ? "#EF4444" : "#E5A93C";
      bgColor = "#121422";
    } else if (diagram.kind === "uml") {
      strokeColor = "#22D3EE";
      bgColor = "#09141F";
    }

    elements.push({
      id: `ai-node-${node.id}-${Date.now()}`,
      type: "technical",
      technicalCategory: diagram.kind === "flowchart" ? "twoffactor" : (diagram.kind as TechnicalCategory),
      x,
      y,
      width,
      height,
      angle: 0,
      strokeColor,
      backgroundColor: bgColor,
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      roundness: true,
      text: `${tr(node.label)}\n${node.description ? `[${tr(node.description)}]` : ""}`,
      fontFamily: "sans",
      fontSize: 11,
      textAlign: "center",
    });
  });

  // Create connecting arrows
  diagram.edges.forEach((edge, idx) => {
    const fromPos = nodePositions[edge.from];
    const toPos = nodePositions[edge.to];

    if (fromPos && toPos) {
      const fromCenterX = fromPos.x + fromPos.width;
      const fromCenterY = fromPos.y + fromPos.height / 2;
      const toCenterX = toPos.x;
      const toCenterY = toPos.y + toPos.height / 2;

      elements.push({
        id: `ai-edge-${idx}-${Date.now()}`,
        type: "arrow",
        x: fromCenterX,
        y: fromCenterY,
        width: Math.abs(toCenterX - fromCenterX) || 80,
        height: Math.abs(toCenterY - fromCenterY) || 20,
        angle: 0,
        strokeColor: "#E5A93C",
        backgroundColor: "transparent",
        fillStyle: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 90,
        roundness: true,
        points: [
          { x: fromCenterX, y: fromCenterY },
          { x: toCenterX, y: toCenterY },
        ],
        text: tr(edge.label || ""),
        fontFamily: "mono",
        fontSize: 10,
      });
    }
  });

  return elements;
}

export function parseMermaidToElements(code: string, startX = 120, startY = 120): PlanoElement[] {
  const lines = code.split("\n");
  const nodesMap = new Map<string, string>();
  const edges: { from: string; to: string; label?: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("graph") || trimmed.startsWith("flowchart")) continue;

    // Matches A[Label] -->|Text| B[Label2] or A --> B
    const arrowMatch = trimmed.match(/([a-zA-Z0-9_\-]+)(?:\[(.*?)\])?\s*-->\s*(?:\|(.*?)\|)?\s*([a-zA-Z0-9_\-]+)(?:\[(.*?)\])?/);
    if (arrowMatch) {
      const fromId = arrowMatch[1];
      const fromLabel = arrowMatch[2] || fromId;
      const edgeLabel = arrowMatch[3] || "";
      const toId = arrowMatch[4];
      const toLabel = arrowMatch[5] || toId;

      nodesMap.set(fromId, fromLabel);
      nodesMap.set(toId, toLabel);
      edges.push({ from: fromId, to: toId, label: edgeLabel });
    }
  }

  if (nodesMap.size === 0) {
    // Basic fallback parsing
    return [];
  }

  const nodes: AIDiagramNode[] = Array.from(nodesMap.entries()).map(([id, label]) => ({
    id,
    label,
  }));

  const diagramResponse: AIDiagramResponse = {
    kind: "flowchart",
    title: "Diagrama Generado desde Mermaid",
    nodes,
    edges,
  };

  return convertAIDiagramToElements(diagramResponse, startX, startY);
}
