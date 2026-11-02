import queue
import threading


class Nodo:
    def __init__(self, nombre, funcion=None, entradas=()):
        self.nombre = nombre
        self.funcion = funcion
        self.entradas = list(entradas)
        self.valor = None
        self.version = 0


class Grafo:
    def __init__(self):
        self.nodos = []
        self.cola = queue.Queue()
        self.al_cambiar = {}

    def fuente(self, nombre):
        nodo = Nodo(nombre)
        self.nodos.append(nodo)
        return nodo

    def derivado(self, nombre, funcion, *entradas):
        nodo = Nodo(nombre, funcion, entradas)
        self.nodos.append(nodo)
        return nodo

    def escuchar(self, nodo, funcion):
        self.al_cambiar[nodo] = funcion

    def publicar(self, fuente, valor):
        self.cola.put((fuente, valor))

    def propagar(self, fuente, valor):
        cambiados = set()
        self._asignar(fuente, valor, cambiados)
        for nodo in self.nodos:
            if nodo.funcion is None:
                continue
            if not any(entrada in cambiados for entrada in nodo.entradas):
                continue
            nuevo = nodo.funcion(*[entrada.valor for entrada in nodo.entradas])
            if nuevo != nodo.valor:
                self._asignar(nodo, nuevo, cambiados)

    def _asignar(self, nodo, valor, cambiados):
        nodo.valor = valor
        nodo.version += 1
        cambiados.add(nodo)
        if nodo in self.al_cambiar:
            self.al_cambiar[nodo](valor, nodo.version)

    def correr(self):
        while True:
            fuente, valor = self.cola.get()
            self.propagar(fuente, valor)

    def arrancar(self):
        hilo = threading.Thread(target=self.correr, daemon=True)
        hilo.start()
        return hilo


class Estable:
    def __init__(self, veces=3):
        self.veces = veces
        self.candidato = None
        self.repeticiones = 0
        self.actual = None

    def __call__(self, votado):
        if votado is None:
            return self.actual
        _, programa = votado
        if programa == self.candidato:
            self.repeticiones += 1
        else:
            self.candidato = programa
            self.repeticiones = 1
        if self.repeticiones >= self.veces:
            self.actual = programa
        return self.actual
