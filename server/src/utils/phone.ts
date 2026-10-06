// Supabase stores phones as digits ("263770000001"); we store E.164 ("+263770000001").
export function toE164(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("263")) return "+" + digits;
  return "+263" + digits.replace(/^0+/, "");
}