// Board content created by the app (example board, technical packages, AI templates).
// It is translated when the element is created, then saved as regular board content.
export const PLANOS_CONTENT_EN: Record<string, string> = {
  // Example board
  "ZONA BLINDADA // ENCLAVE CONFIDENCIAL TWOFFACTOR (FIPS 140-3 NIVEL 4)":
    "ARMORED ZONE // TWOFFACTOR CONFIDENTIAL ENCLAVE (FIPS 140-3 LEVEL 4)",
  "👤 Usuario Cliente\n[Web/App Móvil]\nAutenticación en 2 pasos": "👤 Client User\n[Web/Mobile App]\n2-step authentication",
  "⚡ Gateway Proxy mTLS\n[Go / Envoy]\nBalanceo sub-3ms a nodos": "⚡ mTLS Gateway Proxy\n[Go / Envoy]\nSub-3ms balancing to nodes",
  "🤖 ROBOT BICÉFALO 2FA\n[Consenso FT + JPH]\nNodos Bogotá DC1 + Miami Edge":
    "🤖 DUAL-HEAD 2FA ROBOT\n[FT + JPH Consensus]\nBogotá DC1 + Miami Edge nodes",
  "Doble llave": "Dual key",
  "Pendiente: auditar latencia del túnel mTLS en Miami Edge": "To do: audit mTLS tunnel latency at Miami Edge",

  // Technical packages
  "👤 Usuario Cliente\n[Persona Externa]\nAccede a portal con 2FA": "👤 Client User\n[External Person]\nSigns in to the portal with 2FA",
  "🛡️ Twoffactor Core\n[Software System]\nValidación bicéfala 2FA en <3ms":
    "🛡️ Twoffactor Core\n[Software System]\nDual-head 2FA validation in <3ms",
  "⚡ Gateway Proxy API\n[Container: Go / Rust]\nEnrutamiento mTLS y balanceo":
    "⚡ API Gateway Proxy\n[Container: Go / Rust]\nmTLS routing and balancing",
  "🗄️ Ledger Bóveda\n[Database: PostgreSQL]\nLlaves AES-256 y auditoría": "🗄️ Vault Ledger\n[Database: PostgreSQL]\nAES-256 keys and audit",
  "🔒 Zona Aislada: Enclave Confidencial FIPS 140-3 [Hardware Enclave]":
    "🔒 Isolated Zone: FIPS 140-3 Confidential Enclave [Hardware Enclave]",
  "웃\nOperador Twoffactor\n(Felipe / Pablo)": "웃\nTwoffactor Operator\n(Felipe / Pablo)",
  "▶ Inicio": "▶ Start",
  "⚙ Validar mTLS\nComputar HMAC efímero con nodo Bogotá": "⚙ Validate mTLS\nCompute ephemeral HMAC with the Bogotá node",
  "✕\n¿Firma Válida?": "✕\nValid Signature?",
  "⏹ Fin": "⏹ End",
  "🤖 ROBOT BICÉFALO 2FA\n[Enclave FIPS 140-3 Nivel 4]\nConsenso criptográfico FT + JPH":
    "🤖 DUAL-HEAD 2FA ROBOT\n[FIPS 140-3 Level 4 Enclave]\nFT + JPH cryptographic consensus",
  "🇨🇴 NODO MED-DC1\n[Primario Active-Active]\nLatencia promedio: 1.8ms": "🇨🇴 MED-DC1 NODE\n[Active-Active Primary]\nAverage latency: 1.8ms",
  "🇺🇸 NODO MIA-EDGE\n[Secundario Failover]\nSincronización mTLS espejo": "🇺🇸 MIA-EDGE NODE\n[Failover Secondary]\nMirrored mTLS sync",

  // AI fallback templates
  "👤 Usuario Corporativo": "👤 Corporate User",
  "Inicia sesión con credenciales y reto": "Signs in with credentials and a challenge",
  "⚡ Gateway Proxy mTLS": "⚡ mTLS Gateway Proxy",
  "Terminación TLS y balanceo hacia nodos activos": "TLS termination and balancing to active nodes",
  "🤖 Enclave Bicéfalo 2FA": "🤖 Dual-Head 2FA Enclave",
  "Hardware HSM FIPS 140-3 Nivel 4 (Bogotá + Miami)": "FIPS 140-3 Level 4 HSM hardware (Bogotá + Miami)",
  "🗄️ Bóveda Inmutable": "🗄️ Immutable Vault",
  "Almacén criptográfico con retención cero": "Cryptographic store with zero retention",
  "2. mTLS túnel cifrado": "2. Encrypted mTLS tunnel",
  "3. Firma con doble llave": "3. Dual-key signature",
  "Empresas clientes": "Client companies",
  "Credenciales activas": "Active credentials",
  "Eventos 2FA": "2FA events",
  "1:N (Tiene llaves)": "1:N (Has keys)",
  "1:N (Genera auditorías)": "1:N (Generates audits)",
  "Solicitud de token recibida": "Token request received",
  "⚙ Computar Hash": "⚙ Compute Hash",
  "Algoritmo bicéfalo en <3ms": "Dual-head algorithm in <3ms",
  "✕ ¿Consenso FT+JPH?": "✕ FT+JPH Consensus?",
  "Compuerta de validación de doble firma": "Dual-signature validation gateway",
  "⏹ Fin Aprobado": "⏹ Approved End",
  "Token efímero retornado al cliente": "Ephemeral token returned to the client",
  "Dispara cálculo": "Triggers calculation",
  "Envía a validación": "Sends to validation",
  "Si [Firma Correcta]": "If [Valid Signature]",
  "Contrato público": "Public contract",
  "Motor de consenso": "Consensus engine",
  "Sesión activa": "Active session",
  Implementa: "Implements",
  "Solicita firma": "Requests signature",
  "🇨🇴 Nodo Primario Bogotá": "🇨🇴 Bogotá Primary Node",
  "99.999% SLA (1.8ms latencia)": "99.999% SLA (1.8ms latency)",
  "🤖 Enclave Bicéfalo HSM": "🤖 Dual-Head HSM Enclave",
  "Aislamiento por Hardware FIPS 140-3": "FIPS 140-3 Hardware Isolation",
  "🇺🇸 Nodo Secundario Miami": "🇺🇸 Miami Secondary Node",
  "Failover automático en 3.6ms": "Automatic failover in 3.6ms",
  "Túnel mTLS Primario": "Primary mTLS Tunnel",
  "Réplica continua de estado": "Continuous state replication",
};
