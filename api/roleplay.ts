// Función serverless (formato Web Request/Response, compatible con Vercel y similares).
import { handleRoleplay } from '../server/roleplay';

export const POST = (request: Request) => handleRoleplay(request);
