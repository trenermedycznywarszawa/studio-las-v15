"""Only canonical staging, only the isolated fictional probe account. No secrets printed."""
import base64, concurrent.futures, hashlib, hmac, json, struct, sys, time, urllib.request, urllib.error
from pathlib import Path
BASE = "https://ulauyoqjoetjqktegeuq.supabase.co"
credentials=json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
token=None

def request(path, body=None, method="POST"):
    headers={"apikey":credentials["key"],"Content-Type":"application/json"}
    if token: headers["Authorization"]="Bearer "+token
    req=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=20) as response:
            content=response.read();return response.status,json.loads(content) if content else None
    except urllib.error.HTTPError as error:
        return error.code,json.loads(error.read())

def ok(path,body):
    status,result=request(path,body)
    if status>=300: raise RuntimeError(f"{path}: HTTP {status}, code {result.get('code') or result.get('error_code')}")
    return result

session=ok("/auth/v1/token?grant_type=password",{"email":credentials["email"],"password":credentials["password"]})
token=session["access_token"]
factor=ok("/auth/v1/factors",{"factor_type":"totp","friendly_name":"Fictional overlap probe"})
challenge=ok("/auth/v1/factors/"+factor["id"]+"/challenge",{})
secret=factor["totp"]["secret"]; secret += "="*((8-len(secret)%8)%8)
digest=hmac.new(base64.b32decode(secret),struct.pack(">Q",int(time.time())//30),hashlib.sha1).digest()
offset=digest[-1]&15;code=str((struct.unpack(">I",digest[offset:offset+4])[0]&0x7fffffff)%1000000).zfill(6)
verified=ok("/auth/v1/factors/"+factor["id"]+"/verify",{"challenge_id":challenge["id"],"code":code})
token=verified["access_token"]
claims=json.loads(base64.urlsafe_b64decode(token.split(".")[1]+"=="))
assert claims["aal"]=="aal2"
try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        publisher=pool.submit(request,"/rest/v1/rpc/staging_rebuild_publication_probe",{"p_action":"publish"})
        time.sleep(1)
        edit_status,edit=pool.submit(request,"/rest/v1/rpc/staging_rebuild_publication_probe",{"p_action":"edit"}).result()
        publish_status,publish=publisher.result()
    assert edit_status==200 and edit["blocked"] is True, f"Overlap/edit failed: HTTP {edit_status}, {edit}"
    assert edit["holderPid"] != edit["editorPid"]
    assert publish_status>=400 and "EXPECTED_PROBE_ROLLBACK" in publish.get("message", ""), "Publisher did not deliberately roll back"
    assert str(edit["holderPid"]) in publish["message"]
    print(json.dumps({"result":"HOSTED_PUBLICATION_OVERLAP_PASS","auth":"real password + TOTP AAL2","publisher":publish["message"],"editor":edit},indent=2))
finally:
    request("/auth/v1/logout",method="POST")
