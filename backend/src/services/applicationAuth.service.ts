import { IApplication } from "../models/application.model";
import { verifyAppSecret } from "../utils/crypto.util";
import { findActiveApplicationByClientId } from "../repositories/application.repository";

export type ClientAuthResult =
  | { success: true; application: IApplication }
  | { success: false; status: 401 | 500; message: string };

export const validateClientCredentials = async (
  clientId: string | undefined,
  clientSecret: string | undefined,
): Promise<ClientAuthResult> => {
  if (!clientId || !clientSecret) {
    return {
      success: false,
      status: 401,
      message: "client_id and client_secret are required",
    };
  }

  const application = await findActiveApplicationByClientId(clientId);

  // Intentionally generic — never reveal whether client_id exists
  if (!application) {
    return {
      success: false,
      status: 401,
      message: "Invalid client credentials",
    };
  }

  const isValid = verifyAppSecret(clientSecret, application.clientSecret);
  if (!isValid) {
    return {
      success: false,
      status: 401,
      message: "Invalid client credentials",
    };
  }

  return { success: true, application };
};
