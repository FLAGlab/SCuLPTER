package vision

import scala.scalajs.js
import scala.scalajs.js.annotation._
import sculpter.{Lexer, Parser, Interpreter, Statement, UnaryStatement, BinaryStatement, Expr, StackExpr, NumberExpr, NilExpr, TokenType}

object PuenteJS {
  private def operacion(token: TokenType): String = if (token == TokenType.QUESTION) "?" else token.toString

  private def operando(expr: Expr): String = expr match {
    case StackExpr(nombre) => nombre
    case NumberExpr(valor) => BigDecimal(valor).bigDecimal.stripTrailingZeros.toPlainString
    case NilExpr() => "nil"
  }

  private def mostrar(expr: Expr, sangria: String): String = expr match {
    case StackExpr(nombre) => s"${sangria}Stack: $nombre"
    case NumberExpr(valor) => s"${sangria}Number: $valor"
    case NilExpr() => s"${sangria}Nil"
  }

  private def mostrar(stmt: Statement): String = stmt match {
    case UnaryStatement(op, valor) => s"  UnaryStatement: $op\n" + mostrar(valor, "    ")
    case BinaryStatement(op, a, b) => s"  BinaryStatement: $op\n" + mostrar(a, "    ") + "\n" + mostrar(b, "    ")
  }

  @JSExportTopLevel("sculptAnalizar")
  def analizar(codigoFuente: String): js.Any = {
    Lexer(codigoFuente)
    val lexemas = js.Array[js.Any](Lexer.tokens.map(t => js.Dynamic.literal(
      linea = t.line, tipo = t.tokenType.toString, texto = t.lexeme,
      literal = if (t.literal == null) "" else t.literal.toString
    ))*)
    if (Lexer.hadError) return js.Dynamic.literal(valido = false, etapa = "lexer",
      mensaje = "Hay un símbolo que el lenguaje no reconoce.", lexemas = lexemas)
    val programa = Parser(Lexer.tokens)
    if (Lexer.hadError) return js.Dynamic.literal(valido = false, etapa = "parser",
      mensaje = "Revisa la operación y sus parámetros.", lexemas = lexemas)
    val instrucciones = js.Array[js.Any](programa.statements.map {
      case UnaryStatement(op, valor) => js.Dynamic.literal(token = operacion(op), operandos = js.Array(operando(valor)))
      case BinaryStatement(op, a, b) => js.Dynamic.literal(token = operacion(op), operandos = js.Array(operando(a), operando(b)))
    }*)
    js.Dynamic.literal(valido = true, etapa = "ok", lexemas = lexemas,
      arbol = "Program" + (if (programa.statements.isEmpty) "" else "\n" + programa.statements.map(mostrar).mkString("\n")),
      instrucciones = instrucciones)
  }

  @JSExportTopLevel("sculptEjecutar")
  def ejecutar(codigoFuente: String, maxPasos: Int = 2000): js.Any = {
    Lexer(codigoFuente)
    if (Lexer.hadError) return js.Dynamic.literal(valido = false, etapa = "lexer", decide = "lenguaje",
      mensaje = "Hay un símbolo que el lenguaje no reconoce.")
    val programa = Parser(Lexer.tokens)
    if (Lexer.hadError) return js.Dynamic.literal(valido = false, etapa = "parser", decide = "lenguaje",
      mensaje = "Revisa la operación y sus parámetros.")
    val interprete = new Interpreter()
    interprete.reset(programa)
    val limite = math.max(1, math.min(maxPasos, 10000))
    val pasos = js.Array[js.Any]()
    val traza = js.Array[js.Any]()
    def pilas(): js.Dictionary[js.Any] = js.Dictionary[js.Any](interprete.getStacksState().toSeq.map { case (nombre, valores) =>
      nombre -> (js.Array(valores.map(v => v.fold[js.Any](null)(n => n.asInstanceOf[js.Any]))*): js.Any)
    }*)
    def dentro(pc: Int): Boolean = pc >= 0 && pc < programa.statements.length
    def continuar(): Boolean = interprete.getCurrentStatement() < programa.statements.length
    def siguiente(): js.Any = {
      val pc = interprete.getCurrentStatement()
      if (dentro(pc)) pc.asInstanceOf[js.Any] else null
    }
    def resultado(valido: Boolean, etapa: String, decide: String, mensaje: String = "", error: js.Any = null): js.Any =
      js.Dynamic.literal(valido = valido, etapa = etapa, decide = decide, mensaje = mensaje, pasos = pasos, traza = traza,
        completa = etapa == "ok", limite = limite, error = error, ordenPilas = "tope-primero")
    traza.push(js.Dynamic.literal(paso = 0, instruccion = null, siguiente = siguiente(), pilas = pilas(), omitida = null))
    var ultimaValida = 0
    while (continuar() && pasos.length < limite) {
      val pc = interprete.getCurrentStatement()
      if (dentro(pc)) ultimaValida = pc
      try {
        interprete.stepForward()
        val estado = pilas()
        pasos.push(estado)
        traza.push(js.Dynamic.literal(paso = pasos.length, instruccion = pc, siguiente = siguiente(), pilas = estado,
          omitida = (if (interprete.didSkipInstruction()) (pc + 1).asInstanceOf[js.Any] else null)))
      } catch {
        case e: RuntimeException =>
          val donde = if (dentro(pc)) pc else ultimaValida
          return resultado(false, "runtime", "lenguaje", e.getMessage,
            js.Dynamic.literal(instruccion = donde, mensaje = e.getMessage, decide = "lenguaje",
              fueraDelPrograma = !dentro(pc)))
      }
    }
    if (siguiente() != null) resultado(true, "limite", "puente",
      s"Se alcanzó el límite de $limite pasos. El programa puede contener un ciclo.")
    else resultado(true, "ok", "lenguaje")
  }
}
