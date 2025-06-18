declare module 'express-fileupload' {
  interface UploadedFile {
    name: string;
    data: Buffer;
    size: number;
    encoding: string;
    tempFilePath: string;
    truncated: boolean;
    mimetype: string;
    md5: string;
    mv: (path: string, callback: (err: any) => void) => void;
    mv: (path: string) => Promise<void>;
  }
}
declare module 'lodash';
declare module 'compression';
declare module 'cookie-parser';
