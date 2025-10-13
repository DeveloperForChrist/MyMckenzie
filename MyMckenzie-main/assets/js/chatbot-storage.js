// Attachment upload helper removed — attachments should be uploaded via server endpoints.
export async function uploadAttachment(file) {
  throw new Error('uploadAttachment removed. Use server /api/storage endpoints to upload files.');
}
