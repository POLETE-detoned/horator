// Generado: importa todas las situaciones de Notas de voz (una por línea en cada archivo).
// Importaciones explícitas (sin import.meta.glob) porque la función serverless también lo usa.

import { parseScenarios } from './parse';
import lucia_00 from './lucia-00';
import lucia_01 from './lucia-01';
import lucia_02 from './lucia-02';
import lucia_03 from './lucia-03';
import lucia_04 from './lucia-04';
import lucia_05 from './lucia-05';
import lucia_06 from './lucia-06';
import lucia_07 from './lucia-07';
import marta_00 from './marta-00';
import ramiro_00 from './ramiro-00';

export const LUCIA = parseScenarios('lucia', [lucia_00, lucia_01, lucia_02, lucia_03, lucia_04, lucia_05, lucia_06, lucia_07].join('\n'));
export const MARTA = parseScenarios('marta', [marta_00].join('\n'));
export const RAMIRO = parseScenarios('ramiro', [ramiro_00].join('\n'));
