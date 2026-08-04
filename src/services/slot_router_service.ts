/**
 * JOJO Unified Platform — Business Slot Router Service
 * Automatically routes contracts and transaction documents across 5 business slots.
 */

export interface SlotRouteResult {
  slotName: string;
  kind: 'real_estate' | 'processing' | 'garage' | 'legal' | 'accounting';
  confidence: number;
}

export function routeDocumentToSlot(filename: string, text: string): SlotRouteResult {
  const content = (filename + " " + text).toLowerCase();

  if (content.includes("عقار") || content.includes("إيجار")) {
    return { slotName: "عقارات", kind: "real_estate", confidence: 0.95 };
  }
  if (content.includes("سيارة") || content.includes("كراج")) {
    return { slotName: "كراج", kind: "garage", confidence: 0.95 };
  }
  if (content.includes("قضية") || content.includes("قانون")) {
    return { slotName: "محاماة", kind: "legal", confidence: 0.95 };
  }
  if (content.includes("فاتورة") || content.includes("حسابات")) {
    return { slotName: "محاسبة", kind: "accounting", confidence: 0.95 };
  }
  return { slotName: "تخليص معاملات", kind: "processing", confidence: 0.90 };
}
