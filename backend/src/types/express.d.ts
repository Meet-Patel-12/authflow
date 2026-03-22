import { AuthUser } from "./auth.types";
import { IApiKey } from "../models/apiKey.model";
import { IApplication } from "../models/application.model";

declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      user?: AuthUser;
      orgId?: string;
      apiKey?: IApiKey;
      application?: IApplication;
      requestId?: string;
    }
  }
}

export {};
