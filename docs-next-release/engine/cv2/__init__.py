"""Stands in for OpenCV, which the browser build of Optics leaves out: image matching and screenshots."""


def __getattr__(name):
    def missing(*args, **kwargs):
        raise NotImplementedError(f"cv2.{name}: image matching is not part of Optics in the browser.")
    return missing
