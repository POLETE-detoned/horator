// Contenido de Caza-sinónimos. Cada ronda: frase plana con un fragmento {marcado},
// alternativas buenas (deslizar a la derecha) y trampas (a la izquierda) con su porqué.

export interface Trap {
  word: string;
  why: string;
}
export interface SynonymRound {
  id: string;
  level: number;
  sentence: string;
  good: string[];
  bad: Trap[];
}

export const LEVEL_NAMES = ['', 'Básico', 'Profesional', 'Preciso', 'Culto', 'Maestro'];
export const MAX_LEVEL = 5;

const r = (level: number, sentence: string, good: string[], bad: [string, string][]): Omit<SynonymRound, 'id'> => ({
  level,
  sentence,
  good,
  bad: bad.map(([word, why]) => ({ word, why })),
});

const RAW = [
  // Nivel 1 · Básico
  r(1, 'El proyecto es {muy grande}.', ['enorme', 'colosal', 'ambicioso'], [['gordo', 'Gordo se dice de personas o cosas abultadas, no de proyectos.'], ['alto', 'Alto habla de altura, no de tamaño.']]),
  r(1, 'La película fue {muy buena}.', ['excelente', 'magnífica', 'extraordinaria'], [['rica', 'Rico se dice de la comida.'], ['sabrosa', 'Sabroso describe un sabor.']]),
  r(1, 'Hoy estoy {muy cansado}.', ['agotado', 'exhausto', 'extenuado'], [['aburrido', 'Aburrido no es lo mismo que cansado.'], ['cansino', 'Cansino es quien cansa a los demás.']]),
  r(1, 'Es un problema {muy difícil}.', ['complejo', 'arduo', 'peliagudo'], [['imposible', 'Exagera: difícil no es imposible.'], ['difícilmente', 'Es un adverbio: no encaja aquí.']]),
  r(1, 'Tenemos que {hacer} un plan.', ['elaborar', 'diseñar', 'trazar'], [['fabricar', 'Se fabrican objetos, no planes.'], ['cocinar', 'Demasiado coloquial para un plan de trabajo.']]),
  r(1, 'Fue un día {muy bonito}.', ['maravilloso', 'espléndido', 'memorable'], [['guapo', 'Guapo se dice de personas.'], ['bonachón', 'Bonachón describe el carácter de alguien.']]),
  r(1, 'La reunión fue {muy larga}.', ['interminable', 'eterna', 'maratoniana'], [['ancha', 'Ancho mide anchura, no duración.'], ['alta', 'Alto mide altura, no duración.']]),
  r(1, 'Me {gusta mucho} esta idea.', ['encanta', 'entusiasma', 'apasiona'], [['importa', 'No expresa que te guste.'], ['agrada poco', 'Dice justo lo contrario.']]),
  // Nivel 2 · Profesional
  r(2, 'Tenemos que {decir} los resultados al equipo.', ['comunicar', 'transmitir', 'trasladar'], [['chismorrear', 'Tiene connotación de cotilleo.'], ['pronunciar', 'Se pronuncian palabras o discursos, no resultados.']]),
  r(2, 'Hay que {mejorar} el proceso.', ['optimizar', 'perfeccionar', 'agilizar'], [['maquillar', 'Maquillar mejora solo la apariencia.'], ['empeorar', 'Significa lo contrario.']]),
  r(2, 'Su opinión es {muy importante}.', ['fundamental', 'crucial', 'determinante'], [['famosa', 'Famoso significa conocido, no importante.'], ['pesada', 'Pesado habla de peso o de aburrimiento.']]),
  r(2, 'Vamos a {hablar de} este tema.', ['abordar', 'tratar', 'analizar'], [['esquivar', 'Esquivar es evitarlo.'], ['cotorrear', 'Muy coloquial: hablar sin parar y sin sustancia.']]),
  r(2, 'Es una propuesta {muy buena}.', ['sólida', 'brillante', 'convincente'], [['simpática', 'Simpático describe a personas.'], ['rica', 'Rico se dice de la comida.']]),
  r(2, 'Tenemos que {conseguir} el objetivo.', ['alcanzar', 'lograr', 'cumplir'], [['perseguir', 'Perseguir es intentarlo, no conseguirlo.'], ['coger', 'Coloquial: un objetivo no se coge.']]),
  r(2, 'El informe tiene {muchos} errores.', ['numerosos', 'abundantes', 'múltiples'], [['escasos', 'Escaso significa pocos.'], ['grandes', 'Grande habla de tamaño, no de cantidad.']]),
  r(2, 'Te {pido} que revises el documento.', ['ruego', 'solicito'], [['obligo', 'Convierte la petición en una orden.'], ['suplico', 'Suena desesperado en un contexto de trabajo.']]),
  // Nivel 3 · Preciso
  r(3, 'La empresa {creció mucho} este año.', ['se expandió', 'prosperó', 'despegó'], [['engordó', 'Coloquial y físico: no aplica a empresas.'], ['se estiró', 'Estirarse es alargarse físicamente.']]),
  r(3, 'Su argumento es {muy claro}.', ['nítido', 'diáfano', 'meridiano'], [['blanco', 'Blanco es un color.'], ['aclarado', 'Es un participio: alguien lo aclaró.']]),
  r(3, 'Fue una decisión {muy rápida}.', ['fulminante', 'inmediata', 'expeditiva'], [['precoz', 'Precoz es lo que aparece antes de tiempo, como un talento.'], ['corredora', 'Corredor es quien corre.']]),
  r(3, 'Hay que {quitar} los gastos innecesarios.', ['suprimir', 'eliminar', 'recortar'], [['robar', 'Implica apropiarse de algo ajeno.'], ['esconder', 'Ocultar no es quitar.']]),
  r(3, 'Es una persona {muy lista}.', ['perspicaz', 'sagaz', 'brillante'], [['listilla', 'Tiene matiz despectivo.'], ['lista para salir', 'Cambia el sentido: preparada, no inteligente.']]),
  r(3, 'El cambio fue {muy importante}.', ['trascendental', 'decisivo', 'crucial'], [['ruidoso', 'Ruidoso es sonoro, no importante.'], ['largo', 'Largo habla de longitud o duración.']]),
  r(3, 'Tenemos que {ver} los datos con calma.', ['examinar', 'analizar', 'revisar'], [['ojear', 'Ojear es mirar por encima: lo contrario de "con calma".'], ['espiar', 'Espiar es observar a escondidas.']]),
  r(3, 'El resultado fue {muy malo}.', ['desastroso', 'nefasto', 'desalentador'], [['malvado', 'Malvado se dice de personas con maldad.'], ['feo', 'Feo describe el aspecto.']]),
  // Nivel 4 · Culto
  r(4, 'Su explicación fue {muy corta}.', ['escueta', 'sucinta', 'concisa'], [['baja', 'Bajo describe la altura.'], ['enana', 'Coloquial y referido al tamaño físico.']]),
  r(4, 'La prueba es {indudable}.', ['irrefutable', 'incontestable', 'fehaciente'], [['dudosa', 'Significa lo contrario.'], ['indudablemente', 'Es un adverbio: no encaja.']]),
  r(4, 'Es un tema {muy delicado}.', ['espinoso', 'peliagudo', 'sensible'], [['suave', 'Suave describe una textura.'], ['fino', 'Fino habla de grosor o de elegancia.']]),
  r(4, 'Hay que {hacer más fuerte} la relación con el cliente.', ['afianzar', 'consolidar', 'fortalecer'], [['endurecer', 'Endurecer es volver más rígido o severo.'], ['engordar', 'Engordar es ganar peso.']]),
  r(4, 'Su actitud fue {muy mala}.', ['reprobable', 'deplorable', 'censurable'], [['maléfica', 'Maléfico implica hechizo o daño sobrenatural.'], ['triste', 'Triste describe un estado de ánimo.']]),
  r(4, 'Lo dijo de forma {muy directa}.', ['tajante', 'rotunda', 'categórica'], [['recta', 'Recto describe una línea.'], ['derecha', 'Derecho es una dirección o una postura física.']]),
  r(4, 'Es un detalle {sin importancia}.', ['nimio', 'insignificante', 'baladí'], [['minucioso', 'Minucioso es quien cuida los detalles.'], ['invisible', 'Invisible es lo que no se ve.']]),
  r(4, 'Hay que {pensar bien} antes de decidir.', ['sopesar', 'ponderar', 'meditar'], [['pesar', 'Sin el prefijo, solo es medir el peso.'], ['sospechar', 'Sospechar es desconfiar.']]),
  // Nivel 5 · Maestro
  r(5, 'Su discurso fue {muy bonito y elegante}.', ['elocuente', 'exquisito', 'refinado'], [['cursi', 'Cursi es pretencioso y algo ridículo.'], ['pomposo', 'Pomposo es ostentoso: tiene matiz negativo.']]),
  r(5, 'Su lealtad es {total}.', ['inquebrantable', 'incondicional', 'férrea'], [['tozuda', 'Tozudo es obstinado.'], ['rígida', 'Rígido es inflexible: matiz negativo.']]),
  r(5, 'La situación es {muy urgente}.', ['apremiante', 'acuciante', 'perentoria'], [['premiada', 'Se parece a "apremiante", pero significa que ha ganado un premio.'], ['acusada', 'Acusado significa marcado o culpado.']]),
  r(5, 'Fue un error {que no se puede perdonar}.', ['imperdonable', 'inexcusable', 'injustificable'], [['indeleble', 'Indeleble es lo que no se puede borrar.'], ['inefable', 'Inefable es lo que no se puede expresar con palabras.']]),
  r(5, 'Habló de forma {poco clara}.', ['ambigua', 'confusa', 'imprecisa'], [['ambidiestra', 'Ambidiestro es quien usa ambas manos.'], ['escueta', 'Escueto es breve, no confuso.']]),
  r(5, 'Es una persona {que lo sabe todo}.', ['erudita', 'sabia', 'docta'], [['sabionda', 'Tiene matiz despectivo: presume de saber.'], ['sabrosa', 'Sabroso describe un sabor.']]),
  r(5, 'El plan es {posible de hacer}.', ['viable', 'factible', 'realizable'], [['visible', 'Visible es lo que se ve.'], ['probable', 'Probable es que puede pasar, no que se pueda hacer.']]),
  r(5, 'Su ascenso fue {muy rápido}.', ['meteórico', 'vertiginoso', 'fulgurante'], [['meteorológico', 'Se refiere al tiempo atmosférico.'], ['efímero', 'Efímero es lo que dura poco.']]),
];

export const ROUNDS: SynonymRound[] = RAW.map((x, i) => ({ ...x, id: `s${i}` }));

/** Separa la frase en [antes, fragmento marcado, después]. */
export function splitSentence(sentence: string): [string, string, string] {
  const m = sentence.match(/^(.*)\{(.+)\}(.*)$/);
  return m ? [m[1], m[2], m[3]] : [sentence, '', ''];
}
