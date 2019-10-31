export function dataURLToBlob(base64DataURL: string) {
  const sliceSize = 512;
  const typeMatch = base64DataURL.match(/data:(.*);/);

  if (!typeMatch) {
    throw new Error(`${base64DataURL} is not a valid data URL`);
  }

  const type = typeMatch[1];
  const base64 = base64DataURL.replace(/data:image\/\w+;base64,/, '');

  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, {type});
}
