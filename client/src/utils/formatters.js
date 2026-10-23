/**
 * Formats PAN according to regulatory masking rules:
 * Mask as first 3 chars + XXXXX + last 2 chars (e.g. ZZKXXXXX4Q)
 */
export function maskPAN(pan) {
  if (!pan) return '—';
  const clean = pan.trim().toUpperCase();
  if (clean.length < 5) return '••••••••••';
  return `${clean.substring(0, 3)}XXXXX${clean.substring(clean.length - 2)}`;
}

/**
 * Formats Aadhaar last 4 digits (e.g. •••• •••• 4821)
 * Never stores or formats full 12 digits.
 */
export function maskAadhaar(last4) {
  if (!last4) return '—';
  const digits = String(last4).replace(/\D/g, '').slice(-4);
  return `•••• •••• ${digits}`;
}

/**
 * Formats currency in Indian numbering format (INR)
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || amount === '') return '—';
  const num = Number(amount);
  if (isNaN(num)) return String(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formats date into readable format (e.g. 15 May 1990)
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Formats date with time (e.g. 23 Oct 2026, 14:30 IST)
 */
export function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '—';
  try {
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return dateTimeString;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' IST';
  } catch {
    return dateTimeString;
  }
}

/**
 * Formats confidence score (0 to 1) as percentage (e.g. 98.4%)
 */
export function formatConfidence(score) {
  if (score === undefined || score === null || score === '') return 'N/A';
  const num = Number(score);
  if (isNaN(num)) return 'N/A';
  return `${(num * 100).toFixed(1)}%`;
}

/**
 * Formats file size in readable units
 */
export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
