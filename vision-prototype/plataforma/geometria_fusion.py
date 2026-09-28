import cv2
import numpy as np


def modelo(intr, pose, resolucion):
    if not intr or not pose or list(resolucion) != intr.get('image_size'):
        return None
    k = np.asarray(intr['camera_matrix'], float)
    d = np.asarray(intr['dist_coeffs'], float)
    r = np.asarray(pose['rot'], float)
    t = np.asarray(pose['tras'], float).reshape(3)
    if k.shape != (3, 3) or r.shape != (3, 3) or not all(np.isfinite(a).all() for a in [k, d, r, t]):
        return None
    if abs(np.linalg.det(r)-1) > .01 or min(k[0, 0], k[1, 1]) <= 0:
        return None
    return {'k': k, 'd': d, 'r': r, 't': t, 'centro': -r.T @ t, 'tamano': resolucion}


def rayos(m, pixels):
    uv = cv2.undistortPoints(np.asarray(pixels, float).reshape(-1, 1, 2), m['k'], m['d']).reshape(-1, 2)
    dirs = np.c_[uv, np.ones(len(uv))] @ m['r']
    return dirs / np.linalg.norm(dirs, axis=1)[:, None]


def proyectar(m, puntos):
    puntos = np.asarray(puntos, float).reshape(-1, 3)
    rvec = cv2.Rodrigues(m['r'])[0]
    pixels = cv2.projectPoints(puntos, rvec, m['t'], m['k'], m['d'])[0].reshape(-1, 2)
    z = (puntos @ m['r'].T + m['t'])[:, 2]
    return pixels, z


def triangular(a, ua, b, ub):
    ra, rb = rayos(a, [ua])[0], rayos(b, [ub])[0]
    if np.linalg.norm(a['centro']-b['centro']) < 20 or np.linalg.norm(np.cross(ra, rb)) < .035:
        return None
    dist = np.linalg.lstsq(np.column_stack([ra, -rb]), b['centro']-a['centro'], rcond=None)[0]
    if min(dist) <= 0 or max(dist) > 4000:
        return None
    pa, pb = a['centro']+dist[0]*ra, b['centro']+dist[1]*rb
    if np.linalg.norm(pa-pb) > 5:
        return None
    xyz = (pa+pb)/2
    error = max(np.linalg.norm(proyectar(a, [xyz])[0][0]-ua), np.linalg.norm(proyectar(b, [xyz])[0][0]-ub))
    return (xyz, float(error)) if error <= 3 else None


def nube(m, depth):
    if depth is None or depth.shape != (m['tamano'][1], m['tamano'][0]):
        return np.empty((0, 3))
    yy, xx = np.mgrid[0:depth.shape[0]:2, 0:depth.shape[1]:2]
    z = depth[yy, xx].ravel()
    good = np.isfinite(z) & (z > 100) & (z < 4000)
    if not good.any():
        return np.empty((0, 3))
    uv = cv2.undistortPoints(np.c_[xx.ravel()[good], yy.ravel()[good]].astype(float).reshape(-1, 1, 2), m['k'], m['d']).reshape(-1, 2)
    return (np.c_[uv, np.ones(len(uv))]*z[good, None]-m['t']) @ m['r']


def situar_en_nube(m, obs, puntos, proyeccion):
    if not len(puntos):
        return None
    uv, z = proyeccion
    centro = np.array([obs['x'], obs['y']])
    caja = obs['caja']
    radio = np.clip(min(caja[2:])*.2, 2, 10)
    du, dv = uv[:, 0]-centro[0], uv[:, 1]-centro[1]
    cerca_caja = (np.abs(du) <= radio) & (np.abs(dv) <= radio)
    good = (z > 0) & cerca_caja
    good[good] = du[good]*du[good] + dv[good]*dv[good] <= radio*radio
    if np.count_nonzero(good) < 4:
        return None
    profundidades = z[good]
    cerca = np.quantile(profundidades, .2)
    frente = profundidades[np.abs(profundidades-cerca) < 8]
    if len(frente) < 4 or np.std(frente) > 4:
        return None
    mediana = np.median(frente)
    uv0 = cv2.undistortPoints(centro.reshape(1, 1, 2), m['k'], m['d']).reshape(2)
    return (np.r_[uv0, 1]*mediana-m['t']) @ m['r']


def oculto(m, xyz, depth):
    if depth is None or depth.shape != (m['tamano'][1], m['tamano'][0]):
        return False
    uv, z = proyectar(m, [xyz])
    x, y = np.rint(uv[0]).astype(int)
    if z[0] <= 0 or not 2 <= x < depth.shape[1]-2 or not 2 <= y < depth.shape[0]-2:
        return False
    patch = depth[y-2:y+3, x-2:x+3]
    valid = patch[np.isfinite(patch) & (patch > 0)]
    return len(valid) >= 9 and np.median(valid) < z[0]-12
