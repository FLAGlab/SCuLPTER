import pytest

from lector.lenguaje import INTERPRETE, Lenguaje, codigo

pytestmark = pytest.mark.skipif(not INTERPRETE.exists(), reason="falta npm run build:simulator")


@pytest.fixture(scope="module")
def lenguaje():
    lenguaje = Lenguaje()
    yield lenguaje
    lenguaje.cerrar()


def test_scala_acepta_un_programa_valido(lenguaje):
    programa = [["PUSH", "a", "2"], ["DUP", "a"], ["ADD", "a"]]
    assert lenguaje.analizar(codigo(programa))["valido"]


def test_scala_rechaza_un_mov_sin_segunda_pila(lenguaje):
    assert not lenguaje.es_valida(["MOV", "a"])


def test_los_errores_de_scala_no_rompen_las_respuestas_siguientes(lenguaje):
    assert not lenguaje.es_valida(["PUSH"])
    assert lenguaje.es_valida(["JMP", "-10"])
