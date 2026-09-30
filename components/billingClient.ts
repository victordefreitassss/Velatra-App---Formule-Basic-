import { apiFetch } from "../firebase";
import type { Invoice } from "../types";
export async function billingRequest(
  path: string,
  body?: any,
  method = "POST",
) {
  const res = await apiFetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "L’opération n’a pas été confirmée.");
  return data;
}
export async function downloadReceipt(receipt: Invoice) {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  pdf.setFontSize(20);
  pdf.text("JUSTIFICATIF DE PAIEMENT", 14, 22);
  pdf.setFontSize(11);
  const lines = [
    `Référence : ${receipt.number}`,
    `Date : ${new Date(receipt.date).toLocaleDateString("fr-FR")}`,
    `Structure : ${receipt.clubName || "Non renseignée"}`,
    `Adhérent : ${receipt.memberName || "Non renseigné"}`,
    `Montant : ${receipt.amount.toFixed(2)} ${(receipt.currency || "EUR").toUpperCase()}`,
    receipt.vatRate == null
      ? "TVA non renseignée"
      : `TVA : ${receipt.vatRate} %`,
    "Ce justificatif ne constitue pas une facture fiscale.",
  ];
  pdf.text(pdf.splitTextToSize(lines.join("\n"),180), 14, 40);
  pdf.save(`justificatif_${receipt.id}.pdf`);
}
