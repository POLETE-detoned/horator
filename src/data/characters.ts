import type { VoiceProfile } from '../lib/tts';
import { LUCIA, MARTA, RAMIRO } from './content/escenarios';

export type CharacterId = 'lucia' | 'marta' | 'ramiro';

export interface Scenario {
  id: string;
  title: string;
  /** Primera nota de voz del personaje: plantea el problema. */
  opener: string;
  /** Qué tiene que conseguir el jugador (se muestra como objetivo de la partida). */
  goal: string;
  /** Palabras poderosas sugeridas por el poder "Chuleta". */
  powerWords: string[];
  /** Respuestas de reserva sin conexión, por calidad de la respuesta del jugador (si faltan, las del personaje). */
  offline?: OfflineReplies;
  win?: string;
  lose?: string;
}

export interface OfflineReplies {
  low: string[];
  mid: string[];
  high: string[];
}

export interface Character {
  id: CharacterId;
  name: string;
  role: string;
  avatar: string;
  color: string;
  voice: VoiceProfile;
  /** Personalidad para el LLM. */
  persona: string;
  /** Paciencia: cuánto baja el medidor con una mala respuesta. */
  toughness: number;
  /** Dificultad que representa el personaje. */
  level: 'Básico' | 'Medio' | 'Avanzado';
  /** Respuestas sin conexión comunes a todas sus situaciones. */
  offline: OfflineReplies;
  win: string[];
  lose: string[];
  scenarios: Scenario[];
}

export const CHARACTERS: Character[] = [
  {
    id: 'lucia',
    name: 'Lucía',
    role: 'Tu amiga',
    avatar: '🙋🏻‍♀️',
    color: '#ff7ab6',
    voice: { pitch: 1.15, rate: 1.08, prefer: 'f' },
    persona:
      'Lucía, 31 años, amiga íntima del jugador. Cercana, bromista, un poco dramática y escéptica. Habla de tú, con expresiones coloquiales de España. Se deja convencer por argumentos con gracia y concretos.',
    toughness: 0.6,
    level: 'Básico',
    offline: {
      low: [
        'Mmm… eso me lo dice cualquiera. Dame algo más concreto, porfa.',
        'Ya, pero eso no me ayuda mucho. ¿Por qué lo dices?',
        'Tía, eso suena a frase de taza de desayuno. Concreta un poco.',
        '¿Y ya está? Me esperaba algo con más chicha.',
        'No me convences, ¿eh? Dame un motivo de verdad.',
        'Uf, así no. Venga, que tú sabes hacerlo mejor.',
      ],
      mid: [
        'Vale, eso tiene sentido… pero aún tengo mis dudas.',
        'Hmm, me estás convenciendo un poco. Sigue por ahí.',
        'Bueno, bueno… suena mejor de lo que pensaba.',
        'Oye, no está mal. ¿Y qué más?',
        'Vale, eso me lo apunto. Pero dime algo que me termine de convencer.',
        'Me gusta por dónde vas. Un empujoncito más.',
      ],
      high: [
        '¡Uf! Vale, eso me ha llegado. Visto así, lo tengo bastante más claro.',
        '¡Me encanta cómo lo has dicho! Es justo lo que necesitaba oír.',
        'Jajaja, vale, vale, ¡me has ganado!',
        '¡Dicho así es imposible decir que no!',
        'Madre mía, qué bien argumentas cuando quieres.',
        'Vale, eso ha sido brillante. Me lo guardo.',
      ],
    },
    win: [
      '¡Decidido! Te has ganado una cena, y la eliges tú. 🥂',
      '¡Vale, me has convencido del todo! Eres un crack.',
      '¡Hecho! No sé cómo lo haces, pero siempre me acabas liando para bien.',
      'Me has convencido. Te debo una, y de las grandes.',
    ],
    lose: [
      'Bueno… creo que lo consultaré con la almohada. Gracias igualmente.',
      'Lo siento, esta vez no me has convencido. ¡La próxima será!',
      'Mmm, me quedo como estaba. Pero gracias por intentarlo.',
      'Nada, sigo sin verlo claro. Otro día lo hablamos.',
    ],
    scenarios: [
      {
        id: 'lisboa',
        title: 'El trabajo en Lisboa',
        opener:
          '¡Tía, necesito ayuda! Me ofrecen un trabajo en Lisboa, cobro más, pero aquí tengo a todo el mundo. Dame un argumento de verdad, no un "haz lo que sientas".',
        goal: 'Ayúdala a decidir con argumentos sólidos',
        powerWords: ['oportunidad', 'trascendental', 'perspectiva', 'arraigo'],
        offline: {
          low: ['Mmm… eso me lo dice cualquiera. Dame algo más concreto, porfa.', 'Ya, pero eso no me ayuda mucho. ¿Por qué lo dices?'],
          mid: ['Vale, eso tiene sentido… pero me da miedo echar de menos todo esto.', 'Hmm, me estás convenciendo un poco. ¿Y si sale mal?'],
          high: ['¡Uf! Vale, eso me ha llegado. Visto así, lo tengo bastante más claro.', '¡Me encanta cómo lo has dicho! Eso es justo lo que necesitaba oír.'],
        },
        win: '¡Decidido! Me voy a Lisboa. Te debo una cena, y la eliges tú. 🥂',
        lose: 'Bueno… creo que lo consultaré con la almohada. Gracias igualmente.',
      },
      {
        id: 'cena',
        title: 'La cena del sábado',
        opener:
          'Oye, que el sábado no me apetece nada salir. Estoy reventada. Si quieres que vaya a la cena, vas a tener que venderme la moto muy bien.',
        goal: 'Convéncela para que venga a la cena',
        powerWords: ['inolvidable', 'irresistible', 'merecido', 'improvisado'],
        offline: {
          low: ['Pfff, con eso me quedo en el sofá, te lo aseguro.', '¿Eso es todo? Mi manta es más convincente.'],
          mid: ['Bueno, bueno… suena mejor de lo que pensaba.', 'Vale, me estás tentando un poco. Sigue.'],
          high: ['Jajaja, vale, vale, ¡me has ganado! Eso suena genial.', '¡Dicho así es imposible decir que no!'],
        },
        win: '¡Vale, voy! Pero si me aburro, pagas tú el postre. 😂',
        lose: 'Lo siento, gana el sofá. ¡La próxima vez será!',
      },
      {
        id: 'nombre',
        title: 'El nombre de la startup',
        opener:
          'Vale, escucha: mi startup de comida a domicilio para perros necesita nombre y discurso. Véndemela en una frase como si yo fuera inversora.',
        goal: 'Haz un pitch que la deje con la boca abierta',
        powerWords: ['innovador', 'rentable', 'diferencial', 'escalable'],
        offline: {
          low: ['Mmm… no me compraría ni un hueso con ese pitch.', 'Le falta chispa. ¡Venga, que tú sabes!'],
          mid: ['¡Oye, no está mal! Pero le falta un dato que impresione.', 'Me gusta el rollo. Afínalo un poco más.'],
          high: ['¡Tremendo! Si yo fuera inversora, te firmaba ya.', 'Vale, eso ha sido brillante. Lo apunto TAL CUAL.'],
        },
        win: '¡Nombre y pitch aprobados! Ya puedes ir preparando la ronda de financiación. 🐶',
        lose: 'Creo que de momento lo dejamos en idea de bar…',
      },
      ...LUCIA,
    ],
  },
  {
    id: 'marta',
    name: 'Marta Vidal',
    role: 'Entrevistadora',
    avatar: '👩🏽‍💼',
    color: '#7aa8ff',
    voice: { pitch: 0.95, rate: 1.0, prefer: 'f' },
    persona:
      'Marta Vidal, directora de talento en una gran empresa. Profesional, educada, directa e incisiva. Habla de usted al principio. Valora la concreción, los ejemplos con resultados medibles y el vocabulario preciso. Detecta respuestas vacías y repregunta.',
    toughness: 1,
    level: 'Medio',
    offline: {
      low: [
        'Entiendo. Pero necesito algo más concreto. ¿Qué pasó exactamente?',
        'Eso es muy general. ¿Podría ponerme un ejemplo real?',
        'Eso lo dicen todos los candidatos. ¿Qué le hace distinto?',
        'Me cuesta verlo. Concrete, por favor.',
        'Es una respuesta algo vaga. Desarrolle, por favor.',
        'No me ha quedado claro. ¿Puede ser más preciso?',
      ],
      mid: [
        'Bien, vamos avanzando. ¿Puede demostrarlo con un dato?',
        'Interesante. ¿Qué resultado concreto obtuvo?',
        'De acuerdo. ¿Y cómo lo aplicaría aquí?',
        'Correcto. ¿Qué haría distinto hoy?',
        'Bien. ¿Qué pasos daría en los primeros meses?',
        'Eso suena razonable. Profundice un poco más.',
      ],
      high: [
        'Muy bien explicado. Se nota que lo ha pensado de verdad.',
        'Excelente. Eso es exactamente lo que buscamos.',
        'Eso es convincente. Lo anoto.',
        'Muy bien argumentado. Me deja una impresión muy sólida.',
        'Visión clara y concreta. Me gusta.',
        'Eso demuestra mucha madurez profesional.',
      ],
    },
    win: [
      'Le seré sincera: es de las mejores respuestas que he oído hoy. Pasamos a la siguiente fase.',
      'Me ha convencido. Prepárese para conocer al equipo la semana que viene.',
      'Perfecto. Tiene el perfil que buscamos. Seguimos adelante.',
      'Muy bien. Le llamaremos pronto con buenas noticias.',
    ],
    lose: [
      'Gracias por su tiempo. Le contactaremos con lo que decidamos.',
      'Entendido. Seguiremos valorando al resto de candidatos.',
      'Gracias. Creo que buscamos un perfil con respuestas más concretas.',
      'De acuerdo. Lo tendremos en cuenta. Buenos días.',
    ],
    scenarios: [
      {
        id: 'fracaso',
        title: 'Háblame de un fracaso',
        opener:
          'Buenos días. Empecemos por algo incómodo: cuénteme un fracaso profesional y, sobre todo, qué hizo después.',
        goal: 'Convierte el fracaso en una historia de aprendizaje',
        powerWords: ['aprendizaje', 'resiliente', 'replantear', 'cuantificable'],
        offline: {
          low: ['Entiendo. Pero necesito algo más concreto. ¿Qué pasó exactamente?', 'Eso es muy general. ¿Podría ponerme un ejemplo real?'],
          mid: ['Bien. ¿Y qué resultado concreto obtuvo después de ese cambio?', 'Interesante. ¿Qué haría distinto hoy?'],
          high: ['Muy bien explicado. Se nota que ha reflexionado de verdad.', 'Excelente. Eso es exactamente lo que buscamos.'],
        },
        win: 'Le seré sincera: es de las mejores respuestas que he oído hoy. Pasamos a la siguiente fase.',
        lose: 'Gracias por su tiempo. Le contactaremos con lo que decidamos.',
      },
      {
        id: 'porque-tu',
        title: '¿Por qué tú?',
        opener:
          'Tenemos doscientos candidatos para este puesto. Deme una razón, solo una, para que le elija a usted y no al siguiente.',
        goal: 'Destaca entre doscientos candidatos',
        powerWords: ['diferencial', 'determinante', 'contrastado', 'aportar'],
        offline: {
          low: ['Eso lo dicen todos. ¿Qué le hace distinto de verdad?', 'Mmm. Me cuesta verlo. Concrete, por favor.'],
          mid: ['Bien, vamos avanzando. ¿Puede demostrarlo con un dato?', 'De acuerdo. ¿Y cómo lo aplicaría aquí?'],
          high: ['Eso es convincente. Lo anoto.', 'Muy bien argumentado. Me deja una impresión muy sólida.'],
        },
        win: 'Me ha convencido. Prepárese para conocer al equipo la semana que viene.',
        lose: 'Entendido. Seguiremos valorando al resto de candidatos.',
      },
      {
        id: 'cinco-anos',
        title: 'Dentro de cinco años',
        opener: 'Imagine que han pasado cinco años. ¿Dónde está usted, y por qué eso es bueno para nuestra empresa?',
        goal: 'Une tu ambición con la de la empresa',
        powerWords: ['ambicioso', 'consolidar', 'liderar', 'sostenible'],
        offline: {
          low: ['¿Y la empresa qué gana con eso?', 'Es una respuesta algo vaga. Desarrolle, por favor.'],
          mid: ['Ambicioso. ¿Cómo piensa llegar hasta ahí?', 'Bien. ¿Qué pasos daría el primer año?'],
          high: ['Visión clara y alineada. Me gusta.', 'Eso demuestra mucha madurez profesional.'],
        },
        win: 'Perfecto. Tiene la visión que buscamos. Seguimos adelante.',
        lose: 'Gracias. Creo que necesitamos un perfil con una visión más definida.',
      },
      ...MARTA,
    ],
  },
  {
    id: 'ramiro',
    name: 'Don Ramiro',
    role: 'Cliente difícil',
    avatar: '👴🏻',
    color: '#ffb547',
    voice: { pitch: 0.75, rate: 0.95, prefer: 'm' },
    persona:
      'Don Ramiro, 64 años, dueño de una cadena de ferreterías. Gruñón, impaciente, desconfiado y con prisa. Interrumpe, exige soluciones y odia las excusas y la palabrería. Se ablanda poco a poco cuando le dan soluciones concretas, empatía real y compromisos con fecha.',
    toughness: 1.3,
    level: 'Avanzado',
    offline: {
      low: [
        '¡No me cuente historias! Quiero soluciones.',
        '¿Eso es todo lo que tiene que decir? Increíble.',
        'Palabrería. Ya me las sé todas.',
        'No me convence. ¿Algo más?',
        'Excusas, excusas. Así no vamos a ningún sitio.',
        'Mire, no tengo todo el día. Vaya al grano.',
      ],
      mid: [
        'Bueno… eso ya es algo. ¿Y cuándo exactamente?',
        'Hmm. Sigo enfadado, pero le escucho.',
        'Bien que lo reconozca. ¿Y qué va a cambiar?',
        'Eso suena algo mejor. Concrete más.',
        'Hmm. Siga, a ver.',
        'Vale, vale. Pero quiero compromisos, no promesas.',
      ],
      high: [
        'Vale. Eso es hablar claro. Así sí.',
        'Hmm… bien. Eso me tranquiliza bastante, la verdad.',
        'Eso es asumir responsabilidad. Lo valoro.',
        'Vale, eso son números que entiendo.',
        'Bien. Eso es lo que quería oír.',
        'Hombre, visto así… tiene usted razón.',
      ],
    },
    win: [
      'De acuerdo. Me ha convencido. Pero que no se repita, ¿eh? Seguimos trabajando juntos.',
      'Está bien. Le doy una oportunidad. No la desaproveche.',
      'Vale. Trato hecho. Y no me falle.',
      'Hmm… está bien, me quedo. Pero le estaré vigilando.',
    ],
    lose: [
      '¡Se acabó! Me busco otro proveedor. Buenos días.',
      'Lo siento, ya he perdido demasiado tiempo.',
      'No. Así no. Hablaré con su jefe.',
      'Lo siento, los números mandan. Me voy.',
    ],
    scenarios: [
      {
        id: 'retraso',
        title: 'El pedido que no llegó',
        opener:
          '¡Mire, esto es inadmisible! El pedido tenía que llegar el lunes y hoy es jueves. Tengo las tiendas vacías. ¿Qué piensa hacer usted?',
        goal: 'Calma a Don Ramiro y salva la cuenta',
        powerWords: ['comprendo', 'garantizar', 'prioritario', 'compensación'],
        offline: {
          low: ['¡No me cuente historias! Quiero soluciones.', '¿Eso es todo lo que tiene que decir? Increíble.'],
          mid: ['Bueno… eso ya es algo. ¿Y cuándo exactamente?', 'Hmm. Sigo enfadado, pero le escucho.'],
          high: ['Vale. Eso es hablar claro. Así sí.', 'Hmm… bien. Eso me tranquiliza bastante, la verdad.'],
        },
        win: 'De acuerdo. Me ha convencido. Pero que no se repita, ¿eh? Seguimos trabajando juntos.',
        lose: '¡Se acabó! Me busco otro proveedor. Buenos días.',
      },
      {
        id: 'precio',
        title: 'Demasiado caro',
        opener:
          'Su competencia me ofrece lo mismo un treinta por ciento más barato. Deme un motivo para no cambiarme hoy mismo.',
        goal: 'Defiende el precio sin perder al cliente',
        powerWords: ['rentable', 'fiabilidad', 'inversión', 'tangible'],
        offline: {
          low: ['Palabrería. Treinta por ciento es mucho dinero.', 'No me convence. ¿Algo más?'],
          mid: ['Bueno, la calidad cuenta, sí… ¿pero tanto?', 'Hmm. Siga, a ver.'],
          high: ['Visto así… es verdad que con ustedes no he tenido sustos.', 'Vale, eso son números que entiendo.'],
        },
        win: 'Está bien. Me quedo. Pero el año que viene me lo vuelve a demostrar.',
        lose: 'Lo siento, los números mandan. Me cambio.',
      },
      {
        id: 'presentacion',
        title: 'La presentación desastrosa',
        opener:
          'La presentación de ayer fue un desastre: diapositivas ilegibles y nadie sabía responder. ¿Por qué debería darle una segunda oportunidad?',
        goal: 'Recupera su confianza',
        powerWords: ['asumir', 'replantear', 'compromiso', 'meticuloso'],
        offline: {
          low: ['Excusas. Ya me las sé todas.', '¿Y ya está? Pues vaya.'],
          mid: ['Bien que lo reconozca. ¿Y qué va a cambiar?', 'Eso suena algo mejor. Concrete más.'],
          high: ['Hmm. Eso es asumir responsabilidad. Lo valoro.', 'Bien. Eso es lo que quería oír.'],
        },
        win: 'Vale. Tiene una segunda oportunidad. No la desaproveche.',
        lose: 'Lo siento, ya he perdido demasiado tiempo.',
      },
      ...RAMIRO,
    ],
  },
];

export const getCharacter = (id: CharacterId) => CHARACTERS.find((c) => c.id === id)!;

const pickOne = (arr: string[], rand: () => number) => arr[Math.floor(rand() * arr.length)];

/** Frase de cierre sin IA: la propia de la situación o, si no tiene, una del personaje. */
export const closingLine = (c: Character, s: Scenario, win: boolean, rand: () => number = Math.random) =>
  (win ? s.win : s.lose) ?? pickOne(win ? c.win : c.lose, rand);

/** Turnos máximos por conversación: corta, como una partida. */
export const MAX_TURNS = 4;
