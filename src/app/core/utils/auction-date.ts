export function formatDateOnlyLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(date?: string | null): Date | null {
  if (!date) {
    return null;
  }

  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function isAuctionDatePast(date?: string | null): boolean {
  const auctionDate = parseDateOnly(date);
  if (!auctionDate) {
    return false;
  }

  const bufferEnd = new Date(auctionDate);
  bufferEnd.setDate(bufferEnd.getDate() + 1);
  bufferEnd.setHours(23, 59, 59, 999);

  return new Date() > bufferEnd;
}
