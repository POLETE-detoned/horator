import type { VoiceProfile } from '../lib/tts';

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
  /** Respuestas de reserva sin conexión, por calidad de la respuesta del jugador. */
  offline: { low: string[]; mid: string[]; high: string[] };
  win: string;
  lose: string;
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
    ],
  },
];

export const getCharacter = (id: CharacterId) => CHARACTERS.find((c) => c.id === id)!;

/** Turnos máximos por conversación: corta, como una partida. */
export const MAX_TURNS = 4;
