"""Collect explicitly labelled physical images for later annotation/evaluation."""
import argparse
import json
from pathlib import Path
import time
import cv2


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['camera','out','writer','session','split','kind','expected']:p.add_argument('--'+name,required=True)
    a=p.parse_args()
    if a.split not in ('train','validation','test') or a.kind not in ('operation','parameter'):p.error('Invalid split or kind')
    output=Path(a.out);output.mkdir(parents=True,exist_ok=True)
    camera=cv2.VideoCapture(int(a.camera) if a.camera.isdigit() else a.camera)
    try:
        if not camera.isOpened():raise ValueError('Cannot open camera')
        print('Space: save labelled image. q: quit. Annotate reading corners in the manifest before evaluating.')
        while True:
            ok,frame=camera.read()
            if not ok:break
            cv2.imshow('SCuLPTER dataset',frame)
            key=cv2.waitKey(1)&255
            if key==ord('q'):break
            if key==ord(' '):
                filename=f'{time.time_ns()}.png';cv2.imwrite(str(output/filename),frame)
                row={'image':filename,'writer':a.writer,'session':a.session,'split':a.split,'kind':a.kind,'expected':a.expected,'corners':None}
                with (output/'manifest.jsonl').open('a') as file:file.write(json.dumps(row)+'\n')
    finally:camera.release();cv2.destroyAllWindows()

if __name__=='__main__':main()
