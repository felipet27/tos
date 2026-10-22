// Demo ideas loaded the first time Cultivo opens (upgraded by sanitizeIdea in ideas.ts)
import type { RawIdea } from "./ideas";

export const SEED_IDEAS: RawIdea[] = [
  {
    id: "IDEA-TFF-01",
    title: "SDK Móvil para iOS y Android (React Native & Flutter)",
    description: "Permitir a bancos e integradores incorporar validación bicéfala directamente en aplicaciones móviles con biometría local.",
    author: "Felipe",
    stage: "crecimiento",
    impact: "Alto",
    tags: ["Mobile", "SDK", "Crypto"],
    createdAt: "2026-10-18",
    history: [
      {
        id: "log-1",
        modifiedBy: "Felipe",
        timestamp: "2026-10-18 10:30",
        action: "Creación de idea en etapa 'Semillas (Brotes)'",
      },
      {
        id: "log-2",
        modifiedBy: "Felipe",
        timestamp: "2026-10-19 14:20",
        action: "Movida a etapa 'En Crecimiento'",
        details: "Priorización estratégica con integradores bancarios",
      },
    ],
  },
  {
    id: "IDEA-TFF-02",
    title: "Enclave Confidencial en AWS Nitro & Cloudflare Workers",
    description: "Desplegar nodos sin estado que computan llaves efímeras en memoria encriptada por hardware sin acceso root del host.",
    author: "Pablo",
    stage: "cosecha",
    impact: "Alto",
    tags: ["Infra", "Seguridad", "Hardware"],
    createdAt: "2026-10-15",
    history: [
      {
        id: "log-3",
        modifiedBy: "Pablo",
        timestamp: "2026-10-15 09:15",
        action: "Creación de idea en etapa 'Semillas (Brotes)'",
      },
      {
        id: "log-4",
        modifiedBy: "Pablo",
        timestamp: "2026-10-17 11:00",
        action: "Aprobada para etapa 'Cosecha (Listas para Taller)'",
        details: "Arquitectura validada lista para desarrollo en Taller",
      },
    ],
  },
  {
    id: "IDEA-TFF-03",
    title: "Extensión Web de Cero-Conocimiento para Passkeys",
    description: "Login instantáneo en sitios empresariales sincronizando con el robot de dos cabezas vía WebAuthn.",
    author: "Ambos",
    stage: "semilla",
    impact: "Medio",
    tags: ["Browser", "UX", "WebAuthn"],
    createdAt: "2026-10-20",
    history: [
      {
        id: "log-5",
        modifiedBy: "Juan Pablo",
        timestamp: "2026-10-20 16:45",
        action: "Creación inicial de la idea en etapa 'Semillas (Brotes)'",
      },
    ],
  },
  {
    id: "IDEA-TFF-04",
    title: "Módulo de Auditoría Forense Inmutable en Tiempo Real",
    description: "Visualizador tipo radar de intentos de intrusión y bloqueos con trazabilidad criptográfica exportable.",
    author: "Pablo",
    stage: "crecimiento",
    impact: "Alto",
    tags: ["Auditoría", "Analytics"],
    createdAt: "2026-10-12",
    history: [
      {
        id: "log-6",
        modifiedBy: "Pablo",
        timestamp: "2026-10-12 18:00",
        action: "Creación inicial de la iniciativa",
      },
      {
        id: "log-7",
        modifiedBy: "Felipe",
        timestamp: "2026-10-14 10:10",
        action: "Movida a etapa 'En Crecimiento'",
        details: "Alineada con solicitudes de clientes de Bóveda",
      },
    ],
  },
];
