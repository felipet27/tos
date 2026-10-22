import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Configuración mínima: sitio brochure estático, sin caché incremental.
// Cuando se añada ISR, activar r2IncrementalCache con un bucket R2.
export default defineCloudflareConfig({});
