// Refactor Stage 2 API module: uploads-api.js
async function uploadImage(file, bucket) {
  if (!file) return null;

  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");

  const randomPart = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2);
  const fileName = `${Date.now()}-${randomPart}-${safeName}`;

  const { error } = await supabaseClient.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data } = supabaseClient.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return data.publicUrl;
}
