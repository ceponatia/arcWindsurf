export const deleteSettingFromDb = async (
  settingId: string,
  baseUrl?: string
): Promise<boolean> => {
  const url = `${(baseUrl ?? '').replace(/\/$/, '')}/settings/${encodeURIComponent(settingId)}`;
  const res = await fetch(url, { method: 'DELETE' });
  if (res.status === 204) return true;
  if (res.status === 405) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Filesystem settings cannot be deleted');
  }
  const text = await res.text().catch(() => '');
  throw new Error(text || `Delete failed with status ${res.status}`);
};
