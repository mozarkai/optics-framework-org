"""Stands in for pytest, which the browser build of Optics leaves out: the pytest runner."""


def fail(reason="", pytrace=True):
    raise AssertionError(reason)


def main(*args, **kwargs):
    raise NotImplementedError("The pytest runner is not part of Optics in the browser.")
