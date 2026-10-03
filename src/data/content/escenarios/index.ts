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
import lucia_08 from './lucia-08';
import lucia_09 from './lucia-09';
import lucia_10 from './lucia-10';
import lucia_11 from './lucia-11';
import lucia_12 from './lucia-12';
import lucia_13 from './lucia-13';
import lucia_14 from './lucia-14';
import lucia_15 from './lucia-15';
import lucia_16 from './lucia-16';
import marta_00 from './marta-00';
import ramiro_00 from './ramiro-00';

export const LUCIA = parseScenarios('lucia', [lucia_00, lucia_01, lucia_02, lucia_03, lucia_04, lucia_05, lucia_06, lucia_07, lucia_08, lucia_09, lucia_10, lucia_11, lucia_12, lucia_13, lucia_14, lucia_15, lucia_16].join('\n'));
export const MARTA = parseScenarios('marta', [marta_00].join('\n'));
export const RAMIRO = parseScenarios('ramiro', [ramiro_00].join('\n'));
