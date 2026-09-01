/**
 * Divide un archivo .sql en sentencias ejecutables.
 *
 * Prisma no permite mandar varias sentencias en un solo $executeRawUnsafe, así
 * que hay que separarlas. Un split(';') ingenuo rompe los bloques DO $tag$ ...
 * $tag$ y los literales, por eso este lector reconoce comillas simples y
 * dobles, comentarios de línea y de bloque, y dollar-quoting con etiqueta.
 */
function splitStatements(sql) {
  const statements = [];
  let actual = '';
  let i = 0;

  while (i < sql.length) {
    const resto = sql.slice(i);

    // Comentario de línea: -- hasta el fin de línea
    if (resto.startsWith('--')) {
      const fin = sql.indexOf('\n', i);
      i = fin === -1 ? sql.length : fin + 1;
      continue;
    }

    // Comentario de bloque
    if (resto.startsWith('/*')) {
      const fin = sql.indexOf('*/', i + 2);
      i = fin === -1 ? sql.length : fin + 2;
      continue;
    }

    // Dollar-quoting: $$ ... $$ o $etiqueta$ ... $etiqueta$
    const dollar = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(resto);
    if (dollar) {
      const tag = dollar[0];
      const fin = sql.indexOf(tag, i + tag.length);
      const hasta = fin === -1 ? sql.length : fin + tag.length;
      actual += sql.slice(i, hasta);
      i = hasta;
      continue;
    }

    // Literales entre comillas (simples o dobles); '' y "" escapan la comilla
    if (resto[0] === "'" || resto[0] === '"') {
      const comilla = resto[0];
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === comilla) {
          if (sql[j + 1] === comilla) { j += 2; continue; } // comilla escapada
          j += 1;
          break;
        }
        j += 1;
      }
      actual += sql.slice(i, j);
      i = j;
      continue;
    }

    // Fin de sentencia
    if (resto[0] === ';') {
      if (actual.trim()) statements.push(actual.trim());
      actual = '';
      i += 1;
      continue;
    }

    actual += sql[i];
    i += 1;
  }

  if (actual.trim()) statements.push(actual.trim());
  return statements;
}

module.exports = { splitStatements };
