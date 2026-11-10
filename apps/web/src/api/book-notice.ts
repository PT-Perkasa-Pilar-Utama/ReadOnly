let pendingMasterBooksNotice: string | null = null;

export function setMasterBooksNotice(message: string): void {
  pendingMasterBooksNotice = message;
}

export function takeMasterBooksNotice(): string | null {
  const notice = pendingMasterBooksNotice;
  pendingMasterBooksNotice = null;
  return notice;
}
