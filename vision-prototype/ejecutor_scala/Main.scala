package vision

import sculpter.{Lexer, Parser, InterpreterInstance}

@main def ejecutar(ruta: String): Unit =
  val codigoFuente = scala.io.Source.fromFile(ruta).mkString

  Lexer(codigoFuente)
  if (Lexer.hadError) {
    println("RESULT INVALID lexer")
    sys.exit(1)
  }

  val programa = Parser(Lexer.tokens)
  if (Lexer.hadError) {
    println("RESULT INVALID parser")
    sys.exit(1)
  }

  println(s"PARSED ${programa.statements.length}")

  InterpreterInstance.reset(programa)

  try {
    var continuar = true
    while (continuar) {
      continuar = InterpreterInstance.stepForward()
      if (continuar) {
        val instruccion = InterpreterInstance.getCurrentStatement()
        val pilas = InterpreterInstance.getStacksState()
        val textoPilas = pilas.toList
          .sortBy(_._1)
          .map { case (nombre, valores) =>
            val valoresRenderizados = valores.map(_.map(v => f"$v%.2f".stripSuffix(".00")).getOrElse("nil"))
            s"$nombre=${valoresRenderizados.mkString("[", ",", "]")}"
          }
          .mkString(" ")
        println(s"STEP $instruccion $textoPilas")
      }
    }
    println("RESULT VALID")
  } catch {
    case e: RuntimeException =>
      println(s"RESULT RUNTIME_ERROR ${e.getMessage}")
      sys.exit(1)
  }
end ejecutar
