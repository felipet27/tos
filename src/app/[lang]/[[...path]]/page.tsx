import { TosApp } from "@/components/admin/TosApp";

// Every panel URL (/es, /es/boveda/FF-003, /en/taller/DEV-104...) renders the same client
// app; the module and record come from the path on the client side
export const dynamicParams = true;

export default function TosPage() {
  return <TosApp />;
}
