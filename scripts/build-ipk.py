#!/usr/bin/env python3
"""
X-ray Client for LG webOS TV - IPK Packager
Builds standard webOS .ipk package without requiring webOS SDK.
"""

import os
import io
import time
import tarfile
import json

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
APP_DIR = os.path.join(ROOT_DIR, 'app')
DIST_DIR = os.path.join(ROOT_DIR, 'dist')

# Read configuration from appinfo.json
appinfo_path = os.path.join(APP_DIR, 'appinfo.json')
appinfo = {}
if os.path.exists(appinfo_path):
    with open(appinfo_path, 'r', encoding='utf-8') as f:
        appinfo = json.load(f)

APP_ID = appinfo.get('id', 'org.webosbrew.xray')
VERSION = appinfo.get('version', '1.0.0')
TITLE = appinfo.get('title', 'X-ray Client')
IPK_NAME = f"{APP_ID}_{VERSION}_all.ipk"

os.makedirs(DIST_DIR, exist_ok=True)
ipk_path = os.path.join(DIST_DIR, IPK_NAME)

print(f"Building {IPK_NAME} (App ID: {APP_ID}, Title: {TITLE})...")

# 1. Generate debian-binary
debian_binary = b"2.0\n"

# 2. Generate control.tar.gz
control_content = f"""Package: {APP_ID}
Version: {VERSION}
Section: misc
Priority: optional
Architecture: all
Maintainer: WebOSBrew Community
Description: {TITLE} for LG webOS TV
Installed-Size: 1048576
webOS-Package-Format-Version: 2
""".encode('utf-8')

control_buf = io.BytesIO()
with tarfile.open(fileobj=control_buf, mode='w:gz') as tar:
    ti = tarfile.TarInfo(name='control')
    ti.size = len(control_content)
    ti.mtime = int(time.time())
    ti.mode = 0o644
    tar.addfile(ti, io.BytesIO(control_content))

control_tar_gz = control_buf.getvalue()

# 3. Generate data.tar.gz
data_buf = io.BytesIO()
with tarfile.open(fileobj=data_buf, mode='w:gz') as tar:
    # Applications folder
    app_base_dest = f"usr/palm/applications/{APP_ID}"
    for root, dirs, files in os.walk(APP_DIR):
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, APP_DIR)
            dest_path = f"{app_base_dest}/{rel_path}".replace("\\", "/")
            
            with open(full_path, 'rb') as fp:
                content = fp.read()
            ti = tarfile.TarInfo(name=dest_path)
            ti.size = len(content)
            ti.mtime = int(time.time())
            ti.mode = 0o644
            tar.addfile(ti, io.BytesIO(content))

    # Packageinfo
    pkginfo_content = f'{{"id":"{APP_ID}","version":"{VERSION}","app":"{APP_ID}"}}\n'.encode('utf-8')
    pkginfo_dest = f"usr/palm/packages/{APP_ID}/packageinfo.json"
    ti = tarfile.TarInfo(name=pkginfo_dest)
    ti.size = len(pkginfo_content)
    ti.mtime = int(time.time())
    ti.mode = 0o644
    tar.addfile(ti, io.BytesIO(pkginfo_content))

data_tar_gz = data_buf.getvalue()

# 4. Pack into ar archive format
def make_ar_header(filename, size, mode=0o100644):
    name_field = f"{filename:<16}"[:16].encode('ascii')
    mtime_field = f"{int(time.time()):<12}"[:12].encode('ascii')
    uid_field = f"{0:<6}"[:6].encode('ascii')
    gid_field = f"{0:<6}"[:6].encode('ascii')
    mode_field = f"{oct(mode)[2:]:<8}"[:8].encode('ascii')
    size_field = f"{size:<10}"[:10].encode('ascii')
    magic = b"`\n"
    return name_field + mtime_field + uid_field + gid_field + mode_field + size_field + magic

with open(ipk_path, 'wb') as f:
    f.write(b"!<arch>\n")
    
    # debian-binary
    f.write(make_ar_header("debian-binary", len(debian_binary)))
    f.write(debian_binary)
    if len(debian_binary) % 2 == 1: f.write(b"\n")
    
    # control.tar.gz
    f.write(make_ar_header("control.tar.gz", len(control_tar_gz)))
    f.write(control_tar_gz)
    if len(control_tar_gz) % 2 == 1: f.write(b"\n")
    
    # data.tar.gz
    f.write(make_ar_header("data.tar.gz", len(data_tar_gz)))
    f.write(data_tar_gz)
    if len(data_tar_gz) % 2 == 1: f.write(b"\n")

print(f"[OK] Success! IPK built at: {ipk_path} ({os.path.getsize(ipk_path)} bytes)")
