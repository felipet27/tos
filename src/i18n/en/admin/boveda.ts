// Bóveda (client vault): interface, the five pipeline stages and the demo clients
export const BOVEDA_EN: Record<string, string> = {
  "Fase {phase} habilitada por {name}": "Phase {phase} enabled by {name}",
  "Datos de la propuesta actualizados con éxito.": "Proposal data updated successfully.",
  "BÓVEDA // CLIENTES": "VAULT // CLIENTS",
  "Directorio criptográfico y telemetría por etapas.": "Cryptographic directory and stage-by-stage telemetry.",
  TODOS: "ALL",
  "Anexar Cliente": "Add Client",
  "Buscar cliente...": "Search client...",
  "Resultados ({count})": "Results ({count})",
  "Directorio Completo ({count})": "Full Directory ({count})",
  "Click para abrir": "Click to open",
  'No se encontró ningún cliente con "': 'No client found matching "',
  "En etapa": "In stage",
  "Recientes:": "Recent:",
  "No hay clientes actualmente en esta etapa.": "There are no clients in this stage right now.",
  "• Aprobado por {name}": "• Approved by {name}",
  "• Pendiente Visto Bueno de {name}": "• Awaiting sign-off from {name}",
  ACTUAL: "CURRENT",
  "Mover a": "Move to",
  "EN ESTA ETAPA": "IN THIS STAGE",
  "CONTROL DOBLE FACTOR EN ESPERA:": "DUAL-FACTOR CHECK PENDING:",
  "Las fases": "The phases",
  "fueron registradas por": "were logged by",
  "y requieren el visto bueno de": "and need sign-off from",
  "para completar el sello bicéfalo.": "to complete the dual-head seal.",
  "Ver en +Observatorio": "View in +Observatory",

  // Stage 1
  "ETAPA 1 DE 5": "STAGE 1 OF 5",
  "Levantamiento de Requisitos // Cuaderno Técnico de Información":
    "Requirements Gathering // Technical Information Notebook",
  "Espacio dedicado para que": "A dedicated space for",
  "apunten y consulten toda la información que entrega el cliente.":
    "to record and look up all the information the client provides.",
  "+ Apuntar Nueva Información del Cliente": "+ Record New Client Information",
  "Apuntado por:": "Recorded by:",
  "Escribe aquí los requerimientos del cliente, arquitectura, integraciones, observaciones de seguridad o acuerdos de reunión...":
    "Write the client's requirements, architecture, integrations, security notes or meeting agreements here...",
  "Guardar Información": "Save Information",
  "Registro de Información Apuntada (": "Recorded Information Log (",
  "Aún no se ha apuntado información de levantamiento para este cliente. Utiliza el formulario arriba.":
    "No requirements information has been recorded for this client yet. Use the form above.",

  // Stage 2
  "ETAPA 2 DE 5": "STAGE 2 OF 5",
  "Propuesta por parte de nosotros // Archivos, Presentación & URL del Aplicativo":
    "Our Proposal // Files, Presentation & App URL",
  "Apartados para subir la presentación comercial, el resumen ejecutivo en PDF y vincular la URL del prototipo/propuesta del aplicativo.":
    "Sections to upload the sales deck and the executive summary PDF, and to link the URL of the app prototype/proposal.",
  "Presentación de la Propuesta": "Proposal Presentation",
  "Archivo de diapositivas comercial o presentación ejecutiva (.pptx, .key, .pdf).":
    "Sales deck or executive presentation (.pptx, .key, .pdf).",
  "Archivo Vinculado:": "Linked File:",
  "Nombre del archivo (ej: Propuesta_v2.pptx)": "File name (e.g. Proposal_v2.pptx)",
  "[Subir / Cambiar Archivo]": "[Upload / Replace File]",
  "Descargando {file}...": "Downloading {file}...",
  presentación: "presentation",
  Descargar: "Download",
  "PDF Resumen de la Propuesta": "Proposal Summary PDF",
  "Documento formal en PDF con alcance técnico, cotización, SLA y cláusulas.":
    "Formal PDF document with technical scope, quote, SLA and clauses.",
  "Archivo PDF Vinculado:": "Linked PDF File:",
  "Nombre del archivo PDF (ej: Resumen_Propuesta.pdf)": "PDF file name (e.g. Proposal_Summary.pdf)",
  "[Subir / Cambiar PDF]": "[Upload / Replace PDF]",
  "Abriendo y descargando PDF: {file}...": "Opening and downloading PDF: {file}...",
  resumen: "summary",
  "Ver PDF": "View PDF",
  "Enlace / URL Propuesta del Aplicativo": "App Proposal Link / URL",
  "URL externa hacia el prototipo web, demo interactivo o diseño en Figma del aplicativo que se desarrollará.":
    "External URL to the web prototype, interactive demo or Figma design of the app to be built.",
  "URL de la Propuesta / Prototipo:": "Proposal / Prototype URL:",
  "Link activo": "Live link",
  "Abrir Aplicativo": "Open App",
  "Sin URL": "No URL",
  "Guardar Información de Propuesta": "Save Proposal Information",

  // Stage 3
  "ETAPA 3 DE 5": "STAGE 3 OF 5",
  "Desarrollo // Repositorios en GitHub del Proyecto": "Development // Project GitHub Repositories",
  "Enlaces directos a los repositorios de código fuente, SDKs y microservicios en GitHub asignados a":
    "Direct links to the source code repositories, SDKs and microservices on GitHub assigned to",
  "+ Vincular Nuevo Repositorio de GitHub": "+ Link New GitHub Repository",
  "Nombre o alias del repositorio": "Repository name or alias",
  "ej: twoffactor/cliente-backend-api": "e.g. twoffactor/client-backend-api",
  "URL completa de GitHub": "Full GitHub URL",
  "Vincular Repositorio": "Link Repository",
  "Repositorios Activos en GitHub (": "Active GitHub Repositories (",
  "Aún no hay repositorios de GitHub vinculados. Añade uno con el formulario arriba.":
    "No GitHub repositories linked yet. Add one with the form above.",
  "Branch:": "Branch:",
  "Ver en GitHub": "View on GitHub",

  // Stage 4
  "ETAPA 4 DE 5": "STAGE 4 OF 5",
  "Marcha Blanca // Fases Piloto & Escritos Clave con el Cliente": "Pilot Run // Pilot Phases & Key Notes with the Client",
  "Control de fases de pruebas piloto en Sandbox y banco de escritos / consideraciones críticas acordadas con":
    "Tracking of sandbox pilot test phases and a bank of notes / critical considerations agreed with",
  "Fases Internas de Marcha Blanca": "Internal Pilot Run Phases",
  "✓ Superada": "✓ Passed",
  "En Curso": "In Progress",
  "Escritos y Puntos a Tener en Cuenta con el Cliente": "Notes and Points to Keep in Mind with the Client",
  "Título de la consideración...": "Consideration title...",
  "Escrito por: Felipe": "Written by: Felipe",
  "Escrito por: Juan Pablo": "Written by: Juan Pablo",
  "Punto acordado, horario de pruebas, excepciones o riesgo a vigilar...":
    "Agreed point, test schedule, exceptions or risk to watch...",
  "+ Guardar Escrito": "+ Save Note",

  // Stage 5
  "ETAPA 5 DE 5": "STAGE 5 OF 5",
  "Salida a Producción // Panel de Telemetría PowerBI & Estado de Conexión":
    "Go-Live // PowerBI Telemetry Dashboard & Connection Status",
  "Monitoreo en tiempo real de disponibilidad, métricas de rendimiento y panel de salud para clientes en producción.":
    "Real-time monitoring of availability, performance metrics and a health dashboard for clients in production.",
  "● TODO OK // CERO CAÍDAS": "● ALL OK // ZERO DOWNTIME",
  "DISPONIBILIDAD SLA": "SLA AVAILABILITY",
  "0 segundos de inactividad": "0 seconds of downtime",
  "LATENCIA PROMEDIO": "AVERAGE LATENCY",
  "Óptimo sub-5ms": "Optimal sub-5ms",
  "TRANSACCIONES HOY": "TRANSACTIONS TODAY",
  "100% validadas con 2FA": "100% validated with 2FA",
  "ESTADO DE NODOS": "NODE STATUS",
  "Telemetría de Tráfico en Vivo (Últimas 12 Horas)": "Live Traffic Telemetry (Last 12 Hours)",
  "TASA DE ERROR: 0.000%": "ERROR RATE: 0.000%",
  "Matriz de Resiliencia en Producción": "Production Resilience Matrix",
  "NODO MED-DC1 (Primario)": "NODE MED-DC1 (Primary)",
  "1.8 ms [ACTIVO]": "1.8 ms [ACTIVE]",
  "NODO MIA-EDGE (Secundario)": "NODE MIA-EDGE (Secondary)",
  "23.4 ms [ACTIVO]": "23.4 ms [ACTIVE]",
  "SLA CONTRACTUAL: 100% CUMPLIDO": "CONTRACTUAL SLA: 100% MET",
  "Bitácora de Monitoreo & Notas de Producción": "Monitoring Log & Production Notes",
  "Estado: Todo OK": "Status: All OK",
  "Ventana Mantenimiento": "Maintenance Window",
  "Alerta de Caída": "Downtime Alert",
  "Escribe una nota sobre el funcionamiento en producción...": "Write a note about how production is running...",
  "Guardar Nota de Producción": "Save Production Note",

  // Client card
  "FICHA CRIPTOGRÁFICA Y DE CONTACTO DEL CLIENTE": "CLIENT CRYPTOGRAPHIC & CONTACT CARD",
  "TOKEN 2FA:": "2FA TOKEN:",
  "✓ Copiado": "✓ Copied",
  Copiar: "Copy",
  "Contacto Oficial": "Official Contact",
  "Plan & SLA Contractual": "Plan & Contractual SLA",
  "Nodos y Región": "Nodes and Region",
  "Nodos Active-Active": "Active-Active Nodes",
  "Enlace MED-DC1 + MIA-EDGE": "MED-DC1 + MIA-EDGE Link",
  "Selecciona un cliente de los botones superiores para ver su expediente.":
    "Select a client from the buttons above to view their file.",
  "ANEXAR NUEVO CLIENTE A LA BÓVEDA": "ADD A NEW CLIENT TO THE VAULT",
  "Razón Social / Nombre de Empresa *": "Legal Name / Company Name *",
  "Ej: Inmobiliaria Medellin S.A.S.": "e.g. Inmobiliaria Medellin S.A.S.",
  "Registrar en Bóveda": "Register in Vault",

  // Stages
  "Levantamiento de Requisitos": "Requirements Gathering",
  Levantamiento: "Requirements",
  "Cuaderno técnico de notas e información entregada por el cliente":
    "Technical notebook of notes and information provided by the client",
  "Propuesta de Twoffactor": "Twoffactor Proposal",
  Propuesta: "Proposal",
  "Presentación ejecutiva, PDF resumen y URL prototipo del aplicativo":
    "Executive presentation, summary PDF and app prototype URL",
  Desarrollo: "Development",
  "Repositorios GitHub, ramas y control de despliegues continuos":
    "GitHub repositories, branches and continuous deployment control",
  "Marcha Blanca": "Pilot Run",
  "Fases sandbox piloto y acuerdos/escritos clave con el cliente": "Sandbox pilot phases and key agreements/notes with the client",
  "Salida a Producción": "Go-Live",
  Producción: "Production",
  "Panel PowerBI de telemetría en vivo, disponibilidad y cero caídas":
    "PowerBI dashboard with live telemetry, availability and zero downtime",
  "Requisitos técnicos, arquitectura y notas base": "Technical requirements, architecture and base notes",
  "Propuesta de valor Twoffactor y prototipo funcional": "Twoffactor value proposition and working prototype",
  "Repositorios GitHub, contratos y ramas de desarrollo": "GitHub repositories, contracts and development branches",
  "Marcha blanca, pruebas piloto y acuerdos operativos": "Pilot run, pilot tests and operating agreements",
  "Despliegue a producción y telemetría activa en tiempo real": "Production deployment and live real-time telemetry",
  "Validado conforme a estándar bicéfalo.": "Validated against the dual-head standard.",

  // Demo client: Inmobiliaria Medellin
  "Bienes Raíces & PropTech": "Real Estate & PropTech",
  "Andrés Restrepo (Gerente de Operaciones)": "Andrés Restrepo (Operations Manager)",
  "Protección de portal transaccional de arriendos y pagos en línea. Enlace directo con pasarela PSE y cifrado de contratos digitales.":
    "Protection of a transactional rentals and online payments portal. Direct link to the PSE gateway and encryption of digital contracts.",
  "Levantamiento de notas técnicas, integración pasarela PSE y cifrado de contratos.":
    "Technical notes gathering, PSE gateway integration and contract encryption.",
  "Arquitectura mTLS y SLA de 50ms verificados.": "mTLS architecture and 50ms SLA verified.",
  "Presentación ejecutiva y prototipo de portal entregados al cliente.":
    "Executive presentation and portal prototype delivered to the client.",
  "Propuesta aprobada por junta directiva de Inmobiliaria Medellín.": "Proposal approved by Inmobiliaria Medellín's board.",
  "Repositorio GitHub configurado y túnel seguro con AWS Bogotá desplegado.":
    "GitHub repository configured and secure tunnel to AWS Bogotá deployed.",
  "Pruebas de latencia excelentes (<45ms). Repositorios auditados.": "Excellent latency tests (<45ms). Repositories audited.",
  "Fase sandbox piloto en marcha blanca y protocolos de respaldo en frío.":
    "Sandbox pilot phase in pilot run and cold backup protocols.",
  "El cliente requiere que los pagos de arriendo con PSE validen doble factor en menos de 50ms para evitar abandonos en el checkout de su web inmobiliaria.":
    "The client needs PSE rent payments to validate the dual factor in under 50ms to avoid checkout abandonment on their real estate site.",
  "Tienen un cluster en AWS Bogotá. Vamos a interconectar un túnel mTLS directo hacia el enclave Twoffactor con certificados rotativos.":
    "They have a cluster in AWS Bogotá. We will connect a direct mTLS tunnel to the Twoffactor enclave with rotating certificates.",
  "Fase 1: Configuración de Sandbox y réplica de 50 usuarios de prueba": "Phase 1: Sandbox setup and replica of 50 test users",
  "Verificación de envío de tokens y retención cero.": "Token delivery verification and zero retention.",
  "Fase 2: Conexión con pasarela de pagos en ambiente de pruebas": "Phase 2: Payment gateway connection in the test environment",
  "Transacciones simuladas con tarjetas y transferencias PSE.": "Simulated card and PSE transfer transactions.",
  "Fase 3: Simulación de Failover (desconexión de nodo 1)": "Phase 3: Failover simulation (node 1 disconnection)",
  "El nodo 2 asumió el 100% en 3.6ms sin pérdida de sesión.": "Node 2 took over 100% in 3.6ms with no session loss.",
  "Fase 4: Prueba con usuarios VIP de la inmobiliaria": "Phase 4: Test with the agency's VIP users",
  "Validación de aceptación y firma de contratos.": "Acceptance validation and contract signing.",
  "Consideración de soporte en fines de semana": "Weekend support consideration",
  "El fin de semana del 1 al 5 de cada mes hay picos de pago de arriendo. Se debe tener guardia activa con Juan Pablo en caso de latencia en el banco receptor.":
    "On the weekend between the 1st and 5th of each month there are rent payment peaks. Juan Pablo must be on call in case of latency at the receiving bank.",
  "Compatibilidad con navegadores móviles safari iOS": "Compatibility with Safari iOS mobile browsers",
  "Se verificó que los WebTokens en Safari iOS requirieron ajuste de cabeceras SameSite=None; Secure. Ya quedó resuelto en el proxy.":
    "We verified that WebTokens on Safari iOS needed a SameSite=None; Secure header adjustment. It is now fixed in the proxy.",
  "Servicio operando al 100%. 0 caídas reportadas en los últimos 45 días. Tasa de éxito: 99.998%.":
    "Service running at 100%. 0 outages reported in the last 45 days. Success rate: 99.998%.",

  // Demo client: Papas la 49
  "Gastronomía & Franquicias": "Food Service & Franchises",
  "Mateo Londoño (Director de Expansión)": "Mateo Londoño (Head of Expansion)",
  "Seguridad 2FA para sistema POS distribuido en 14 puntos de venta y bodega central.":
    "2FA security for a POS system spread across 14 stores and a central warehouse.",
  "Requisitos de terminales POS táctiles en 14 sucursales.": "Requirements for touchscreen POS terminals in 14 branches.",
  "Revisado y validado.": "Reviewed and validated.",
  "Propuesta comercial POS y demo prototipo.": "POS sales proposal and prototype demo.",
  "Tarifas y alcance aprobados.": "Pricing and scope approved.",
  "Despliegue del conector bridge para terminales POS.": "Deployment of the bridge connector for POS terminals.",
  "Código auditado.": "Code audited.",
  "Piloto en sede Poblado y sede Laureles sin incidencias.": "Pilot at the Poblado and Laureles stores with no incidents.",
  "Pruebas offline superadas con éxito.": "Offline tests passed successfully.",
  "Puesta en producción de los 14 puntos de venta.": "Go-live of the 14 stores.",
  "Producción 100% activa sin caídas.": "Production 100% live with no outages.",
  "Tienen 14 puntos físicos con terminales táctiles Android y Windows. Cada cajero debe autenticar apertura de turno con código efímero Twoffactor.":
    "They have 14 physical stores with Android and Windows touchscreen terminals. Every cashier must authenticate the start of their shift with an ephemeral Twoffactor code.",
  "Piloto en sede Poblado y sede Laureles": "Pilot at the Poblado and Laureles stores",
  "Pruebas de apertura de caja y facturación.": "Register opening and invoicing tests.",
  "Validación de conexión sin internet temporal (offline token)": "Validation without a temporary internet connection (offline token)",
  "Caché criptográfico validado.": "Cryptographic cache validated.",
  "Horario pico de pedidos (Viernes a Domingo 6pm-10pm)": "Peak ordering hours (Friday to Sunday 6pm-10pm)",
  "Monitoreo prioritario en horas de la noche donde se procesa el 70% de la facturación semanal.":
    "Priority monitoring in the evening hours, when 70% of weekly sales are processed.",
  "Los 14 puntos de venta activos. 0 incidencias. Telemetría en tiempo real fluida.":
    "All 14 stores live. 0 incidents. Real-time telemetry flowing smoothly.",

  // Demo client: Naty Marin
  "Marca Personal & Ecommerce": "Personal Brand & Ecommerce",
  "Blindaje contra picos masivos de tráfico en lanzamientos de productos en Shopify Plus.":
    "Protection against massive traffic spikes during product launches on Shopify Plus.",
  "Levantamiento antibot para 30k usuarios concurrentes en Shopify Plus.":
    "Anti-bot requirements for 30k concurrent users on Shopify Plus.",
  "Revisado conforme.": "Reviewed and approved.",
  "Carga de presentación ejecutiva y demo interactivo del launchpad.":
    "Executive presentation and interactive launchpad demo uploaded.",
  "Repositorio Shopify App creado en branch develop.": "Shopify App repository created on the develop branch.",
  "En cada lanzamiento entran 30,000 personas en los primeros 10 minutos. Necesitan que los bots de reventa no acaparen el stock y que el doble factor sea invisible para compradores reales.":
    "Every launch brings 30,000 people in the first 10 minutes. They need resale bots kept from hoarding stock, with the dual factor invisible to real buyers.",
  "Prueba de carga simulada con 40,000 usuarios virtuales": "Simulated load test with 40,000 virtual users",
  "Stress test en sandbox.": "Stress test in the sandbox.",
  "Regla estricta de 1 compra por tarjeta cada 60 segundos": "Strict rule of 1 purchase per card every 60 seconds",
  "Acuerdo con Naty para prevenir compradores fraudulentos que usan proxies.":
    "Agreement with Naty to prevent fraudulent buyers who use proxies.",

  // Demo client: Arepas Cheese Corn
  "Alimentos & Retail Internacional": "Food & International Retail",
  "Catalina Vélez (Gerencia General)": "Catalina Vélez (General Management)",
  "Interconexión de cadena de suministro y despacho a retail en Colombia y exportación a USA.":
    "Supply chain interconnection and retail distribution in Colombia, plus exports to the USA.",
  "Requisitos B2B para pedidos mayoristas hacia USA con tokens de gerencia.":
    "B2B requirements for wholesale orders to the USA with management tokens.",
  "Revisión conforme.": "Review approved.",
  "Propuesta de seguridad y portal B2B cargados.": "Security proposal and B2B portal uploaded.",
  "Reunión con Catalina: Exportan a distribuidores en Florida y Texas. Quieren un portal B2B donde las órdenes de compra lleven firma criptográfica aprobada por gerencia.":
    "Meeting with Catalina: they export to distributors in Florida and Texas. They want a B2B portal where purchase orders carry a cryptographic signature approved by management.",

  // Demo client: Andres USA Sorteos
  "Entretenimiento & Pagos Cross-Border": "Entertainment & Cross-Border Payments",
  "Plataforma de alta concurrencia en Miami y Latam con pagos internacionales y validación instantánea.":
    "High-concurrency platform in Miami and Latin America with international payments and instant validation.",
  "Requisitos de aleatoriedad criptográfica verificable y doble factor en retiro.":
    "Requirements for verifiable cryptographic randomness and dual factor on withdrawals.",
  "Presentación plataforma Enterprise y demo en vivo.": "Enterprise platform presentation and live demo.",
  "Aprobado por el cliente.": "Approved by the client.",
  "Despliegue del motor de sorteos y bóveda HSM Twoffactor.": "Deployment of the raffle engine and the Twoffactor HSM vault.",
  "Stress test con 100,000 boletos y validación bancaria en Florida.":
    "Stress test with 100,000 tickets and bank validation in Florida.",
  "Cero discrepancias en transacciones.": "Zero transaction discrepancies.",
  "Clúster cuádruple activo en Miami y Bogotá. Disponibilidad 100%.": "Quad cluster live in Miami and Bogotá. 100% availability.",
  "Producción óptima.": "Optimal production.",
  "Manejan miles de transacciones con Stripe y Zelle en USA. Requerían certificación de aleatoriedad criptográfica verificable en sorteos y doble factor en retiro de premios.":
    "They handle thousands of Stripe and Zelle transactions in the USA. They needed verifiable cryptographic randomness certification for raffles and dual factor on prize withdrawals.",
  "Validación de latencia desde Miami y Bogotá": "Latency validation from Miami and Bogotá",
  "Menor a 24ms promedio.": "Under 24ms on average.",
  "Prueba de sorteo en vivo con 100,000 boletos": "Live raffle test with 100,000 tickets",
  "Cero discrepancias en ledger.": "Zero ledger discrepancies.",
  "Regulaciones de transferencias bancarias en Florida": "Bank transfer regulations in Florida",
  "Todo retiro superior a $10,000 USD requiere doble aprobación: token de Andrés + token de Twoffactor.":
    "Every withdrawal above $10,000 USD needs dual approval: Andrés's token + Twoffactor's token.",
  "Plataforma en vivo con clúster cuádruple de 4 nodos. Disponibilidad 100%. Sin caídas ni alertas.":
    "Platform live on a 4-node quad cluster. 100% availability. No outages or alerts.",

  // Demo client: David Molina
  "Arquitectura, Diseño & Urbanismo": "Architecture, Design & Urban Planning",
  "Bóveda de planos confidenciales BIM, renders y licitaciones de obras de lujo.":
    "Vault for confidential BIM blueprints, renders and luxury construction bids.",
  "Protección de planos CAD confidenciales y tokens temporales de 1h.": "Protection of confidential CAD blueprints and 1h temporary tokens.",
  "David necesita proteger los archivos CAD y renders 3D de proyectos residenciales exclusivos. Quiere que los contratistas sólo puedan descargar planos con un token temporal de 1 hora.":
    "David needs to protect the CAD files and 3D renders of exclusive residential projects. He wants contractors to download blueprints only with a 1-hour temporary token.",
};
