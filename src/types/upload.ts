export interface UploadedFilePayload {
  path: string;
  content: string;
  encoding?: 'utf8' | 'base64';
}
