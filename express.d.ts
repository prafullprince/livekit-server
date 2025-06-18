import { UploadedFile } from "express-fileupload";

interface UploadedFile {
  name: string;
  data: Buffer;
  size: number;
  encoding: string;
  tempFilePath: string;
  truncated: boolean;
  mimetype: string;
  md5: string;
  mv: (savePath: string, callback: (err: any) => void) => void;
}

export interface UserPayload {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload | undefined;
      files?: {
        [key: string]: UploadedFile | UploadedFile [];
      }
    }
  }
}

export {};
