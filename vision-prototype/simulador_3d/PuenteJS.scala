package vision

import scala.scalajs.js
import scala.scalajs.js.annotation._
import sculpter.{Lexer, Parser, InterpreterInstance}

object PuenteJS {
  @JSExportTopLevel("sculptEjecutar")
  def ejecutar(codigoFuente: String): js.Any = {
    Lexer(codigoFuente)
    if (Lexer.hadError) {
      return js.Dynamic.literal(valido = false, etapa = "lexer")
    }
    val programa = Parser(Lexer.tokens)
    if (Lexer.hadError) {
      return js.Dynamic.literal(valido = false, etapa = "parser")
    }
    InterpreterInstance.reset(programa)
    val pasos = js.Array[js.Any]()
    var continuar = true
    try {
      while (continuar) {
        continuar = InterpreterInstance.stepForward()
        if (continuar) {
          val pilas = InterpreterInstance.getStacksState()
          val pilasJs = js.Dictionary[js.Any](pilas.toSeq.map { case (nombre, valores) =>
            nombre -> (js.Array(valores.map(_.getOrElse(Double.NaN)): _*): js.Any)
          }: _*)
          pasos.push(pilasJs)
        }
      }
      js.Dynamic.literal(valido = true, etapa = "ok", pasos = pasos)
    } catch {
      case e: RuntimeException =>
        js.Dynamic.literal(valido = false, etapa = "runtime", mensaje = e.getMessage, pasos = pasos)
    }
  }
}
