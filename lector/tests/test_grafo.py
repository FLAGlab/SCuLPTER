from lector.grafo import Estable, Grafo


def test_un_nodo_se_calcula_una_vez_por_cambio_aunque_tenga_dos_caminos():
    grafo = Grafo()
    fuente = grafo.fuente("x")
    doble = grafo.derivado("doble", lambda x: x * 2, fuente)
    triple = grafo.derivado("triple", lambda x: x * 3, fuente)
    vistos = []

    def suma(a, b):
        vistos.append((a, b))
        return a + b

    grafo.derivado("suma", suma, doble, triple)
    grafo.propagar(fuente, 1)
    grafo.propagar(fuente, 2)
    assert vistos == [(2, 3), (4, 6)]


def test_si_un_valor_no_cambia_no_se_avisa_hacia_adelante():
    grafo = Grafo()
    fuente = grafo.fuente("x")
    signo = grafo.derivado("signo", lambda x: x > 0, fuente)
    avisos = []
    grafo.escuchar(signo, lambda valor, version: avisos.append((valor, version)))
    for x in [1, 2, 3, -1]:
        grafo.propagar(fuente, x)
    assert avisos == [(True, 1), (False, 2)]


def test_estable_espera_varias_votaciones_iguales():
    estable = Estable(veces=3)
    programa = [["PUSH", "a", "2"]]
    assert estable((1, programa)) is None
    assert estable((2, programa)) is None
    assert estable((3, programa)) == programa


def test_estable_ignora_un_cuadro_ruidoso_en_medio():
    estable = Estable(veces=2)
    viejo = [["PUSH", "a", "2"]]
    nuevo = [["PUSH", "a", "3"]]
    estable((1, viejo))
    estable((2, viejo))
    assert estable((3, nuevo)) == viejo
    assert estable((4, viejo)) == viejo
    estable((5, nuevo))
    assert estable((6, nuevo)) == nuevo
