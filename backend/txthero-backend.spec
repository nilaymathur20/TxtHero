from PyInstaller.utils.hooks import collect_all
from pathlib import Path


backend_dir = Path(SPECPATH)
datas = []
binaries = []
hiddenimports = []

for package in ("uvicorn", "pycrdt", "pycrdt.websocket", "websockets"):
    package_datas, package_binaries, package_hiddenimports = collect_all(package)
    datas += package_datas
    binaries += package_binaries
    hiddenimports += package_hiddenimports


analysis = Analysis(
    [str(backend_dir / "run.py")],
    pathex=[str(backend_dir)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
)
pyz = PYZ(analysis.pure)
exe = EXE(
    pyz,
    analysis.scripts,
    analysis.binaries,
    analysis.datas,
    [],
    name="txthero-backend",
    console=False,
)
