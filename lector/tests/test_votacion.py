from lector.votacion import HUECO, alinear, elegir, votar


def instruccion(*nombres, parecido=0.9):
    return [[(nombre, parecido)] for nombre in nombres]


PUSH = instruccion("PUSH", "a", "2")
DUP = instruccion("DUP", "a")
ADD = instruccion("ADD", "a")


def nombres(programa, es_valida=lambda n: True, minimo=1):
    return [elegir(votada, es_valida, minimo) for votada in programa]


def test_dos_lecturas_iguales_se_alinean_una_a_una():
    assert alinear([PUSH, DUP, ADD], [PUSH, DUP, ADD]) == [PUSH, DUP, ADD]


def test_una_camara_que_no_vio_un_bloque_deja_un_hueco_en_la_alineacion():
    assert alinear([PUSH, DUP, ADD], [PUSH, ADD]) == [PUSH, None, ADD]


def test_gana_lo_que_ven_mas_camaras():
    otra = instruccion("PUSH", "b", "2")
    programa = votar([[PUSH], [PUSH], [otra]])
    assert nombres(programa) == [["PUSH", "a", "2"]]


def test_lo_que_ve_una_sola_camara_queda_como_hueco():
    programa = votar([[PUSH, DUP], [PUSH], [PUSH]])
    assert nombres(programa, minimo=2) == [["PUSH", "a", "2"], [HUECO, HUECO]]


def test_el_lenguaje_descarta_la_combinacion_invalida():
    dudosa = [
        [("MOV", 0.9), ("PUSH", 0.8)],
        [("a", 0.9)],
        [("2", 0.9)],
    ]
    programa = votar([[dudosa], [dudosa]])

    def es_valida(n):
        return n[0] != "MOV"

    assert nombres(programa, es_valida, minimo=2) == [["PUSH", "a", "2"]]


def test_sin_lecturas_no_hay_programa():
    assert votar([[], []]) == []
