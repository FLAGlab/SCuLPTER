package vision

import scala.scalajs.js
import scala.scalajs.js.annotation._
import sculpter.{Lexer, Parser, Interpreter}

object PuenteJS {
  @JSExportTopLevel("sculptEjecutar")
  def ejecutar(codigoFuente: String, maxPasos: Int = 2000): js.Any = {
    Lexer(codigoFuente)
    if (Lexer.hadError) return js.Dynamic.literal(valido = false, etapa = "lexer", mensaje = "Hay un símbolo que el lenguaje no reconoce.")
    val programa = Parser(Lexer.tokens)
    if (Lexer.hadError) return js.Dynamic.literal(valido = false, etapa = "parser", mensaje = "Revisa la operación y sus parámetros.")
    val interprete = new Interpreter()
    interprete.reset(programa)
    val limite = math.max(1, math.min(maxPasos, 10000))
    val pasos = js.Array[js.Any]()
    val traza = js.Array[js.Any]()
    def pilas(): js.Dictionary[js.Any] = js.Dictionary[js.Any](interprete.getStacksState().toSeq.map { case (nombre, valores) =>
      nombre -> (js.Array(valores.map(v => v.fold[js.Any](null)(n => n.asInstanceOf[js.Any])): _*): js.Any)
    }: _*)
    def siguiente(): js.Any = {
      val pc = interprete.getCurrentStatement()
      if (pc >= programa.statements.length) null else pc.asInstanceOf[js.Any]
    }
    def resultado(valido: Boolean, etapa: String, mensaje: String = "", error: js.Any = null): js.Any =
      js.Dynamic.literal(valido = valido, etapa = etapa, mensaje = mensaje, pasos = pasos, traza = traza,
        completa = etapa == "ok", limite = limite, error = error, ordenPilas = "tope-primero")
    traza.push(js.Dynamic.literal(paso = 0, instruccion = null, siguiente = siguiente(), pilas = pilas(), omitida = null))
    while (siguiente() != null && pasos.length < limite) {
      val pc = interprete.getCurrentStatement()
      try {
        interprete.stepForward()
        val estado = pilas()
        pasos.push(estado)
        traza.push(js.Dynamic.literal(paso = pasos.length, instruccion = pc, siguiente = siguiente(), pilas = estado,
          omitida = (if (interprete.didSkipInstruction()) (pc + 1).asInstanceOf[js.Any] else null)))
      } catch {
        case e: RuntimeException =>
          return resultado(false, "runtime", e.getMessage, js.Dynamic.literal(instruccion = pc, mensaje = e.getMessage))
      }
    }
    if (siguiente() != null) resultado(true, "limite", s"Se alcanzó el límite de $limite pasos. El programa puede contener un ciclo.")
    else resultado(true, "ok")
  }
}
