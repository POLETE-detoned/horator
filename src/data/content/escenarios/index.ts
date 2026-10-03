// Generado: importa todas las situaciones de Notas de voz (una por línea en cada archivo).
// Importaciones explícitas (sin import.meta.glob) porque la función serverless también lo usa.

import { parseScenarios } from './parse';
import lucia_00 from './lucia-00';
import marta_00 from './marta-00';
import ramiro_00 from './ramiro-00';

export const LUCIA = parseScenarios('lucia', [lucia_00].join('\n'));
export const MARTA = parseScenarios('marta', [marta_00].join('\n'));
export const RAMIRO = parseScenarios('ramiro', [ramiro_00].join('\n'));
