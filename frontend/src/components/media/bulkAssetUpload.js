// Keep successful uploads when asset creation fails so Retry does not upload the file again.
export async function uploadAssetBatch({ entries, projectId, category, description, uploadFile, createAsset, onChange, onCreated }) {
  if (!projectId) throw new Error('Select a project before uploading assets.');
  const results = [];
  for (const entry of entries) {
    if (entry.status === 'complete') { results.push(entry); continue; }
    let current = { ...entry, status: 'uploading', error: '' };
    onChange(current);
    try {
      if (!current.uploaded) {
        const response = await uploadFile(current.file, projectId);
        current.uploaded = response?.data;
        if (!current.uploaded?.url) throw new Error('The upload did not return a file URL.');
      }
      current = { ...current, status: 'creating' };
      onChange(current);
      const file = current.uploaded;
      const response = await createAsset({
        title: current.title.trim(), description: description.trim(), category: category.trim(),
        projectId, section: 'asset', moduleType: 'asset', metadata: {},
        storageUrl: file.url, storageKey: file.storageKey,
        storageProvider: file.storageProvider || 'cloudinary', thumbnailUrl: file.thumbnailUrl || '',
        mimeType: file.mimeType || current.file.type, fileSizeBytes: file.fileSizeBytes || current.file.size,
      });
      current = { ...current, status: 'complete', asset: response?.data };
    } catch (error) {
      current = { ...current, status: 'failed', error: error.message || 'Upload failed. Try again.' };
    }
    onChange(current);
    results.push(current);
    if (current.status === 'complete') onCreated(current.asset);
  }
  return results;
}
